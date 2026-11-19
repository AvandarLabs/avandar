/** Public motion components and deterministic, serializable timing helpers. */
export { DiagramCamera } from "./DiagramCamera";
export type { DiagramCameraProps } from "./DiagramCamera";
export {
  cameraTrackSchema,
  createCameraTrackSchema,
  getCameraPose,
  isCameraMoving,
  retimeCameraTrack,
} from "./cameraTrack";
export type { CameraKeyframe, CameraPose } from "./cameraTrack";
export { AnchoredOverlay } from "./AnchoredOverlay";
export { getOverlayPose } from "./getOverlayPose";
export { getOverlayTimings } from "./getOverlayTimings";
export type { MotionRect, OverlayCue } from "./getOverlayTimings";
export { SvgObjectDeparture } from "./SvgObjectDeparture";
export { getObjectFlight } from "./getObjectFlight";
export type { ObjectFlight } from "./getObjectFlight";
export { SharedElement } from "./SharedElement";
export { HorizontalBlurFilter } from "./HorizontalBlur";
export { getHorizontalBlurFilter } from "./getHorizontalBlurFilter/getHorizontalBlurFilter";
export type { SharedElementProps } from "./SharedElement";
export { SceneTransition } from "./SceneTransition";
export { createSceneTransition } from "./createSceneTransition";
export { getSceneTransitionStyle } from "./getSceneTransitionStyle";
export type {
  SceneTransitionKind,
  SceneTransitionProps,
} from "./getSceneTransitionStyle";
export {
  MOTION_PRESETS,
  motionOptionsSchema,
  motionEasingSchema,
  resolveMotionSettings,
  getMotionDuration,
  getMotionProgress,
  getMotionEasing,
} from "./motionSettings";
export type { MotionOptions, MotionEasing } from "./motionSettings";
