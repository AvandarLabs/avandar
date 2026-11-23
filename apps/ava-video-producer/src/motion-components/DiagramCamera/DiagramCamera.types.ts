import type { CameraKeyframe } from "../CameraTrack/CameraTrack";
import type { MotionOptions } from "../MotionSettings/MotionSettings";
import type { ReactNode } from "react";

export type CameraViewportOptions = {
  children: ReactNode;
  blur: boolean;
  samples: number;
  shutterAngle: number;
};
export type DiagramCameraProps = MotionOptions & {
  track?: readonly CameraKeyframe[];
  width?: number;
  height?: number;
  enabled?: boolean;
  motionBlur?: boolean;
  /** Include an independently moving vector cutout in the shutter samples. */
  blurActive?: boolean;
  /** Optional shutter settings for an independently moving vector object. */
  blurOptions?: Pick<
    MotionOptions,
    "shutterAngle" | "samples" | "blurStrength"
  >;
  render: (frame: number) => ReactNode;
};
export type CameraSampleProps = {
  track?: readonly CameraKeyframe[];
  width: number;
  height: number;
  enabled: boolean;
  render: (frame: number) => ReactNode;
  motion: MotionOptions;
};
