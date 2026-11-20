/** Public motion components and deterministic, serializable timing helpers. */
export { DiagramCamera } from "./DiagramCamera";
export type { DiagramCameraProps } from "./DiagramCamera";
export {
  cameraTrackSchema,
  createCameraTrackSchema,
  getCameraPose,
  isCameraMoving,
  retimeCameraTrack,
} from "./cameraTrack/cameraTrack";
export type { CameraKeyframe, CameraPose } from "./cameraTrack/cameraTrack";
export {
  AnchoredOverlay,
  getOverlayPose,
  getOverlayTimings,
} from "./AnchoredOverlay/AnchoredOverlay";
export type { MotionRect, OverlayCue } from "./AnchoredOverlay/AnchoredOverlay";
export {
  SvgObjectDeparture,
  getObjectFlight,
} from "./SvgObjectDeparture/SvgObjectDeparture";
export type { ObjectFlight } from "./SvgObjectDeparture/SvgObjectDeparture";
export { SharedElement } from "./SharedElement";
export {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "./HorizontalBlur";
export type { SharedElementProps } from "./SharedElement";
export {
  SceneTransition,
  makeSceneTransitionSpecFromProps,
  getSceneTransitionStyle,
} from "./SceneTransition/SceneTransition";
export type {
  SceneTransitionKind,
  SceneTransitionProps,
} from "./SceneTransition/SceneTransition";
export { MotionSettings } from "./MotionSettings/MotionSettings";
export type {
  MotionOptions,
  MotionEasing,
} from "./MotionSettings/MotionSettings";
