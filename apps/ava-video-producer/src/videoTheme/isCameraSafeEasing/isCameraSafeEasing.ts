import type { EasingValue } from "../videoTheme.types";

/**
 * Whether a curve can drive a camera: a bezier whose control points all lie
 * in 0..1, so the camera never overshoots its framings, or the cubic power
 * curve, the one power curve camera motion supports. The resolver enforces
 * it for camera tokens, and the token editor offers only these curves there.
 */
export function isCameraSafeEasing(easing: EasingValue): boolean {
  if ("powerInOut" in easing) {
    return easing.powerInOut === 3;
  }
  return easing.every((point) => point >= 0 && point <= 1);
}
