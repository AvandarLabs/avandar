import type { CSSProperties } from "react";

export { trackPos, downAt } from "../cursor-motion";

/**
 * The fake app window every composition is drawn inside, plus the pointer.
 *
 * Keep this shared. Three compositions each carrying their own copy of the
 * title bar and cursor is how they drift apart, and a fix stops being
 * inherited. Same reasoning as motion.ts.
 *
 * Never put a transform on the chrome container: it resamples every glyph
 * inside it, so the bar and the header must never sit inside a lasting
 * transform.
 */

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

export { AppFrame, BAR, HEAD, BODY_Y } from "./AppFrame";
export { Orb } from "./Orb";
export { Cursor } from "./Cursor";
