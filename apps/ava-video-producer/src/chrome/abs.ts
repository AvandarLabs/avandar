import type { CSSProperties } from "react";

/** An absolute-positioned rectangle in canvas pixels. */
export type Box = { x: number; y: number; w: number; h: number };

/** Absolute-position a box. Compositions lay themselves out in explicit
 *  pixel coordinates rather than flexbox, because a demo is choreography:
 *  you need to know where a thing is in order to point at it on frame 214. */
export function abs(box: Box): CSSProperties {
  return {
    position: "absolute",
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    boxSizing: "border-box",
  };
}
