import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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
const REGISTER_AT = 53;
const REGISTER_FRAMES = 57;
/**
 * Transform coordinate representations while preserving landmark identities.
 */
export function makeRegisteredLandmarksFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: Pick<VideoMotion, "ramp" | "scale" | "travel">;
}>): RegisteredLandmark[] {
  const progress = motion.ramp(
    frame,
    REGISTER_AT,
    motion.scale(REGISTER_FRAMES),
    motion.travel.easing,
  );
  return input.landmarks.map((point, index) => {
    const targetX = point.x * input.transform.scaleX + input.transform.offsetX;
    const targetY = point.y * input.transform.scaleY + input.transform.offsetY;
    return {
      ...point,
      index,
      targetX,
      targetY,
      canvasX: Motion.mix({
        t: progress,
        from: 65 + point.x * 2.4,
        to: 555 + targetX * 2.4,
      }),
      canvasY: Motion.mix({
        t: progress,
        from: 185 + point.y * 2.4,
        to: 185 + targetY * 2.4,
      }),
    };
  });
}
