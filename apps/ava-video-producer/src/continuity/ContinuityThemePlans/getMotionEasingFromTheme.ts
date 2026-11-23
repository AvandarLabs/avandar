import { isCameraSafeEasing } from "../../videoTheme/isCameraSafeEasing/isCameraSafeEasing";
import type { MotionEasing } from "../../motion-components/MotionSettings/MotionSettings";
import type { EasingValue } from "../../videoTheme/videoTheme.types";
/**
 * A theme curve as a camera curve. The resolver already rejects curves that
 * are not camera-safe, so the throw only guards a theme that skipped it.
 */
export function getMotionEasingFromTheme({
  easing,
  tokenPath,
}: Readonly<{
  easing: EasingValue;
  tokenPath: string;
}>): MotionEasing {
  if (!isCameraSafeEasing(easing)) {
    throw new Error(
      `${tokenPath}: a camera curve must keep its control points between 0 and 1, or be the cubic in-out`,
    );
  }
  if ("powerInOut" in easing) {
    return "ease-in-out-cubic";
  }
  const [x1, y1, x2, y2] = easing;
  return [x1, y1, x2, y2];
}
