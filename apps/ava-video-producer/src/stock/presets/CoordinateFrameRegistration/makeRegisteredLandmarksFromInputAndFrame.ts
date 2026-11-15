import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./CoordinateFrameRegistration.schema";
/** Data for RegisteredLandmark. */
type RegisteredLandmarkResult = {
  index: number;
  targetX: number;
  targetY: number;
  canvasX: number;
  canvasY: number;
};

type RegisteredLandmark = Input["landmarks"][number] & RegisteredLandmarkResult;
/**
 * Transform coordinate representations while preserving landmark identities.
 */
export function makeRegisteredLandmarksFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): RegisteredLandmark[] {
  const progress = ramp(frame, 53, 57, EASE.inOut);
  return input.landmarks.map((point, index) => {
    const targetX = point.x * input.transform.scaleX + input.transform.offsetX;
    const targetY = point.y * input.transform.scaleY + input.transform.offsetY;
    return {
      ...point,
      index,
      targetX,
      targetY,
      canvasX: mix(progress, 65 + point.x * 2.4, 555 + targetX * 2.4),
      canvasY: mix(progress, 185 + point.y * 2.4, 185 + targetY * 2.4),
    };
  });
}
