import { useLingui } from "@lingui/react/macro";
import { SkipLinks } from "../SkipLinks/SkipLinks";
import css from "./MapShell.module.css";
import type { ReactNode, RefCallback } from "react";

type Props = {
  /** The map itself, rendered as the substrate under every panel. */
  canvas: ReactNode;
  topBar: ReactNode;
  layerPanel: ReactNode;
  inspector: ReactNode;
  legend: ReactNode;
  toolCluster: ReactNode;
  statusCard: ReactNode;
  furnitureBar: ReactNode;

  /** Centred over the map, shown only when the map has no layers. */
  firstRunCard: ReactNode;

  /** Name announced for the map region, e.g. "Map of Cholera response". */
  mapLabel: string;

  /** Whether floating map chrome, including skip links, is hidden. */
  isChromeHidden: boolean;

  topBarRef: RefCallback<HTMLDivElement>;
  leftColumnRef: RefCallback<HTMLDivElement>;
  rightColumnRef: RefCallback<HTMLDivElement>;
};

function _renderChrome(
  options: Readonly<{
    topBar: ReactNode;
    layerPanel: ReactNode;
    inspector: ReactNode;
    legend: ReactNode;
    toolCluster: ReactNode;
    statusCard: ReactNode;
    firstRunCard: ReactNode;
    isChromeHidden: boolean;
    topBarRef: RefCallback<HTMLDivElement>;
    leftColumnRef: RefCallback<HTMLDivElement>;
    rightColumnRef: RefCallback<HTMLDivElement>;
    readOnlyHeading: string;
    readOnlyBody: string;
  }>,
): ReactNode {
  const {
    topBar,
    layerPanel,
    inspector,
    legend,
    toolCluster,
    statusCard,
    firstRunCard,
    isChromeHidden,
    topBarRef,
    leftColumnRef,
    rightColumnRef,
    readOnlyHeading,
    readOnlyBody,
  } = options;
  return (
    <div className={css.mapShellChrome}>
      <SkipLinks isChromeHidden={isChromeHidden} />
      <div className={css.mapShellReadOnlyNotice} role="status">
        <span>
          <strong>{readOnlyHeading}</strong> {readOnlyBody}
        </span>
      </div>
      {isChromeHidden ? null : (
        <>
          <div className={css.mapShellTopBar} ref={topBarRef}>
            {topBar}
          </div>
          {firstRunCard ?
            <div className={css.mapShellFirstRun}>{firstRunCard}</div>
          : null}
          <div className={css.mapShellLeftColumn} ref={leftColumnRef}>
            {layerPanel}
          </div>
          <div className={css.mapShellRightColumn} ref={rightColumnRef}>
            {inspector}
          </div>
          <div className={css.mapShellBottomLeft}>{legend}</div>
          <div className={css.mapShellBottomCenter}>
            {statusCard}
            {toolCluster}
          </div>
        </>
      )}
    </div>
  );
}

/** Renders the full-bleed map with floating chrome and a furniture strip. */
export function MapShell({
  canvas,
  topBar,
  layerPanel,
  inspector,
  legend,
  toolCluster,
  statusCard,
  furnitureBar,
  firstRunCard,
  mapLabel,
  isChromeHidden,
  topBarRef,
  leftColumnRef,
  rightColumnRef,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <div className={css.mapShell}>
      <div
        className={css.mapShellSurface}
        role="region"
        aria-label={t`${mapLabel}. Use the layer panel to change what is shown.`}
      >
        {canvas}
        {_renderChrome({
          topBar,
          layerPanel,
          inspector,
          legend,
          toolCluster,
          statusCard,
          firstRunCard,
          isChromeHidden,
          topBarRef,
          leftColumnRef,
          rightColumnRef,
          readOnlyHeading: t`Viewing only on this screen size.`,
          readOnlyBody: t`Pan, zoom and tap a feature to read it. To edit layers, open this map on a tablet or a laptop.`,
        })}
      </div>
      {furnitureBar}
    </div>
  );
}
