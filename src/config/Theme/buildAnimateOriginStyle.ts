import type { CSSProperties } from "react";

/** Viewport top-left of the animated surface (e.g. saved floating window position). */
export type AnimateTargetAnchor = {
  left: number;
  top: number;
};

/**
 * Maps a trigger element's center to coordinates relative to the animated
 * target so scale and border-radius can grow out from the trigger (ooze-in).
 */
export function buildAnimateOriginStyle(
  originRect: DOMRect,
  target: DOMRect | AnimateTargetAnchor,
): CSSProperties {
  const targetLeft = "width" in target ? target.left : target.left;
  const targetTop = "height" in target ? target.top : target.top;

  return {
    "--ava-animate-origin-x": `${originRect.left + originRect.width / 2 - targetLeft}px`,
    "--ava-animate-origin-y": `${originRect.top + originRect.height / 2 - targetTop}px`,
  } as CSSProperties;
}
