import type { CSSProperties } from "react";

/** Absolutely positions an element at a pixel rect computed by scene layout. */
export function positioned(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CSSProperties {
  return {
    position: "absolute",
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    boxSizing: "border-box",
  };
}
