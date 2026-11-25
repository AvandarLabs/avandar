import { useEffect, useRef, useState } from "react";
import css from "@/views/GisApp/panels/LayerPanel/LayerPanel.module.css";
import type { ReactNode } from "react";

/** Matches the grid-template-rows transition on `.layerEditor`. */
const EDITOR_MOTION_MS = 200;

type Motion = {
  content: ReactNode;
  isShown: boolean;
};

/**
 * Keeps the editor mounted through its close transition, and waits a frame
 * before marking it open so the height can animate from zero.
 */
function useLayerEditorMotion(isOpen: boolean, editor: ReactNode): Motion {
  const contentRef = useRef(editor);
  if (isOpen) {
    contentRef.current = editor;
  }
  const [isShown, setIsShown] = useState(isOpen);
  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      const frame = requestAnimationFrame(() => {
        setIsShown(true);
      });
      return () => {
        cancelAnimationFrame(frame);
      };
    }
    setIsShown(false);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timeout = window.setTimeout(
      () => {
        setIsMounted(false);
      },
      reduceMotion ? 0 : EDITOR_MOTION_MS,
    );
    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  return {
    content: isMounted ? contentRef.current : null,
    isShown,
  };
}

type Props = {
  editor: ReactNode;
};

/** The layer editor under the list. Its height follows the open state. */
export function LayerEditorFrame({ editor }: Props): ReactNode {
  const motion = useLayerEditorMotion(editor != null, editor);
  return (
    <div
      className={css.layerEditor}
      data-open={motion.isShown ? "true" : "false"}
    >
      <div className={css.layerEditorInner}>{motion.content}</div>
    </div>
  );
}
