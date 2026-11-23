import { CameraTrack } from "./CameraTrack/CameraTrack";
/** Public motion components and deterministic, serializable timing helpers. */
export { DiagramCamera } from "./DiagramCamera/DiagramCamera";
export type { DiagramCameraProps } from "./DiagramCamera/DiagramCamera";
export { cameraTrackSchema } from "./CameraTrack/CameraTrack";
export { CameraTrack };
/** Documented timing API available to authored film compositions. */
export const createCameraTrackSchema = CameraTrack.makeSchemaFromViewport;
/** Documented timing API available to authored film compositions. */
export const getCameraPose = CameraTrack.getPose;
/** Documented timing API available to authored film compositions. */
export const isCameraMoving = CameraTrack.isMoving;
/** Documented timing API available to authored film compositions. */
export const retimeCameraTrack = CameraTrack.retime;
export type { CameraKeyframe, CameraPose } from "./CameraTrack/CameraTrack";
export { AnchoredOverlay } from "./AnchoredOverlay";
export { getOverlayPose } from "./getOverlayPose";
export { getOverlayTimings } from "./getOverlayTimings";
export type { MotionRect, OverlayCue } from "./getOverlayTimings";
export { SvgObjectDeparture } from "./SvgObjectDeparture";
export { getObjectFlight } from "./getObjectFlight/getObjectFlight";
export type { ObjectFlight } from "./getObjectFlight/getObjectFlight";
export { SharedElement } from "./SharedElement";
export type { SharedElementProps } from "./SharedElement";
export { HorizontalBlurFilter } from "./HorizontalBlurFilter";
export { getHorizontalBlurFilter } from "./getHorizontalBlurFilter/getHorizontalBlurFilter";
export { SceneTransition } from "./SceneTransition";
export { makeSceneTransitionSpecFromProps } from "./makeSceneTransitionSpecFromProps";
export { getSceneTransitionStyle } from "./getSceneTransitionStyle";
export type {
  SceneTransitionKind,
  SceneTransitionProps,
} from "./getSceneTransitionStyle";
export { MotionSettings } from "./MotionSettings/MotionSettings";
export type {
  MotionOptions,
  MotionEasing,
} from "./MotionSettings/MotionSettings";
