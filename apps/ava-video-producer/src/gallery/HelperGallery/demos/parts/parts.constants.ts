import { WINDOW_TILT } from "../../../../scenes/TiltedWindowScene/windowTilt";
import type { WindowPose } from "../../../../scenes/TiltedWindowScene/windowMotion";

/** A window at rest in its box, in the tilted plane. */
export const RESTING_WINDOW_POSE: WindowPose = {
  translateX: 0,
  translateZ: 0,
  rotateY: WINDOW_TILT.rotateY,
  opacity: 1,
  blurX: 0,
};
