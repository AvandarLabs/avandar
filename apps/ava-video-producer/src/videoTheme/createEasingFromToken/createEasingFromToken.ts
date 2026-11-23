import { bezier } from "../../motion";
import type { EasingValue } from "../videoTheme.types";

/**
 * The easing function for an easing token: a CSS-style cubic Bezier, or a
 * symmetric power curve (`{ powerInOut: 3 }` is cubic in-out). Use it where
 * a renderer animates with a themed curve, for example a draw-on ramp.
 */
export function createEasingFromToken(
  easing: EasingValue,
): (progress: number) => number {
  if ("powerInOut" in easing) {
    const exponent = easing.powerInOut;
    return (progress) =>
      progress < 0.5
        ? 2 ** (exponent - 1) * progress ** exponent
        : 1 - (-2 * progress + 2) ** exponent / 2;
  }
  const [x1, y1, x2, y2] = easing;
  return bezier(x1, y1, x2, y2);
}
