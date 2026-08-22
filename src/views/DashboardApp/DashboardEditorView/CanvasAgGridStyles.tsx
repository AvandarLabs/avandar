import type { Overrides } from "@puckeditor/core";
import type { ReactElement } from "react";

import { useEffect } from "react";

/** ag-grid tags every stylesheet it injects at runtime with this attribute. */
const AG_GRID_STYLE_SELECTOR = "style[data-ag-global-css]";

type Props = Parameters<Overrides["iframe"]>[0];

/**
 * Copies ag-grid's stylesheets from the host page's head into a frame's head,
 * adding the ones the frame is missing and refreshing the ones that changed.
 */
function syncAgGridStyles(options: {
  frameDocument: Document;
  frameHead: HTMLHeadElement;
  hostHead: HTMLHeadElement;
}): void {
  const { frameDocument, frameHead, hostHead } = options;

  hostHead
    .querySelectorAll<HTMLStyleElement>(AG_GRID_STYLE_SELECTOR)
    .forEach((hostStyle) => {
      const chunkName = hostStyle.dataset.agGlobalCss;
      if (!chunkName) {
        return;
      }

      const frameStyle = frameHead.querySelector<HTMLStyleElement>(
        `style[data-ag-global-css="${CSS.escape(chunkName)}"]`,
      );

      if (!frameStyle) {
        const newStyle = frameDocument.createElement("style");
        newStyle.dataset.agGlobalCss = chunkName;
        newStyle.textContent = hostStyle.textContent;
        frameHead.append(newStyle);
        return;
      }

      // Keeps up with theme changes, which rewrite a chunk in place.
      if (frameStyle.textContent !== hostStyle.textContent) {
        frameStyle.textContent = hostStyle.textContent;
      }
    });
}

/**
 * Puck `iframe` override that keeps ag-grid's runtime stylesheets in sync
 * between the host page and the canvas iframe.
 *
 * ag-grid's Theming API injects one stylesheet per component into the host
 * page's `<head>` the first time that component renders. Puck copies the host
 * page's stylesheets into the canvas iframe when the frame mounts, but a chunk
 * that lands outside that window never reaches the iframe: the pagination bar,
 * for one, then loses its gaps and row spacing and collapses into "1to25of25".
 * Which chunks arrive late depends on what a dashboard renders and when, so
 * rather than restate ag-grid's rules and let them drift, this mirrors every
 * ag-grid stylesheet into the frame.
 */
export function CanvasAgGridStyles({
  children,
  document: frameDocument,
}: Props): ReactElement {
  useEffect(
    function mirrorAgGridStylesIntoCanvasFrame() {
      if (!frameDocument) {
        return;
      }

      const hostHead = window.document.head;
      const frameHead = frameDocument.head;

      const syncStyles = (): void => {
        syncAgGridStyles({ frameDocument, frameHead, hostHead });

        // Our own writes are not news. Dropping the records they queued stops
        // the two observers from triggering each other indefinitely.
        hostObserver.takeRecords();
        frameObserver.takeRecords();
      };

      const observerOptions = {
        characterData: true,
        childList: true,
        subtree: true,
      };
      const hostObserver = new MutationObserver(syncStyles);
      const frameObserver = new MutationObserver(syncStyles);

      syncStyles();

      // Puck clears the frame's head once its own copy pass finishes, which
      // can land either side of this effect, so the frame head is watched too
      // and a cleared mirror is put back.
      hostObserver.observe(hostHead, observerOptions);
      frameObserver.observe(frameHead, observerOptions);

      return () => {
        hostObserver.disconnect();
        frameObserver.disconnect();
        frameHead
          .querySelectorAll(AG_GRID_STYLE_SELECTOR)
          .forEach((frameStyle) => {
            frameStyle.remove();
          });
      };
    },
    [frameDocument],
  );

  return <>{children}</>;
}
