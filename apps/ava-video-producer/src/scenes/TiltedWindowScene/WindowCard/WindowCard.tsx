import { HorizontalBlurFilter } from "../../../motion-components/HorizontalBlurFilter";
import { useWindowCardState } from "./useWindowCardState";
import { WindowCardPlane } from "./WindowCardPlane/WindowCardPlane";
import type { Props } from "./WindowCard.types";
import type { ReactNode } from "react";

/**
 * One tilted window card holding a still or footage: rounded, shadowed,
 * with an optional titlebar, posed in 3D and blurred along X while it
 * moves. Used by every `TiltedWindowScene` layout. The plane and chrome are
 * `components.WindowTilt`; the shadow is `elevation.window` in the scene's
 * shadow colour, or a mix of its background when the theme sets none.
 */
export function WindowCard({
  frame,
  rect,
  pose,
  source,
  canvasHeight,
  tilt = 1,
  chrome = "titlebar",
  rotateX,
  rotateZ,
  perspective,
  clipPath,
}: Props): ReactNode {
  const content = useWindowCardState({
    input: {
      frame,
      rect,
      pose,
      source,
      canvasHeight,
      tilt,
      chrome,
      rotateX,
      rotateZ,
      perspective,
      clipPath,
    },
  });
  return (
    <>
      <HorizontalBlurFilter id={content.filterId} amount={pose.blurX} />
      <WindowCardPlane {...content} />
    </>
  );
}
