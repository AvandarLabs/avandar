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
export {
  AnchoredOverlay,
  getOverlayPose,
  getOverlayTimings,
} from "./AnchoredOverlay";
export type { MotionRect, OverlayCue } from "./AnchoredOverlay";
export { SvgObjectDeparture, getObjectFlight } from "./SvgObjectDeparture";
export type { ObjectFlight } from "./SvgObjectDeparture";
export { SharedElement } from "./SharedElement";
export type { SharedElementProps } from "./SharedElement";
export {
  SceneTransition,
  createSceneTransition,
  getSceneTransitionStyle,
} from "./SceneTransition";
export type {
  SceneTransitionKind,
  SceneTransitionProps,
} from "./SceneTransition";
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
