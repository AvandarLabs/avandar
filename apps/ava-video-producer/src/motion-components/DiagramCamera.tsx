import { CameraMotionBlur } from "@remotion/motion-blur";
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import {
  createCameraTrackSchema,
  getCameraPose,
  isCameraMoving,
} from "./cameraTrack";
import css from "./MotionComponents.module.css";
import { resolveMotionSettings } from "./motionSettings";
import type { CameraKeyframe } from "./cameraTrack";
import type { MotionOptions } from "./motionSettings";
import type { ReactNode } from "react";

/** Vector-only camera. The render callback receives the real, fractional content frame. */
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

type CameraSampleProps = {
  track?: readonly CameraKeyframe[];
  width: number;
  height: number;
  enabled: boolean;
  render: (frame: number) => ReactNode;
  motion: MotionOptions;
};

function CameraSample({
  track,
  width,
  height,
  enabled,
  render,
  motion,
}: CameraSampleProps) {
  const frame = useCurrentFrame();
  const pose = getCameraPose(track, frame, enabled, motion, { width, height });
  const visibleWidth = width / pose.zoom;
  const visibleHeight = height / pose.zoom;
  return (
    <svg
      className={css.cameraSample}
      viewBox={`${pose.x - visibleWidth / 2} ${pose.y - visibleHeight / 2} ${visibleWidth} ${visibleHeight}`}
    >
      {render(frame)}
    </svg>
  );
}

function CameraViewport({
  children,
  blur,
  samples,
  shutterAngle,
}: {
  children: ReactNode;
  blur: boolean;
  samples: number;
  shutterAngle: number;
}) {
  return (
    <div className={css.cameraViewport} data-camera-moving={blur || undefined}>
      {blur ? (
        <CameraMotionBlur samples={samples} shutterAngle={shutterAngle}>
          {children}
        </CameraMotionBlur>
      ) : (
        children
      )}
    </div>
  );
}

/** Pan and zoom through SVG artwork with travel-only temporal motion blur. */
export function DiagramCamera({
  track,
  width = 960,
  height = 600,
  enabled = true,
  motionBlur = true,
  blurActive = false,
  blurOptions,
  render,
  ...motion
}: DiagramCameraProps) {
  const frame = useCurrentFrame();
  const validatedTrack = useMemo(
    () => track && createCameraTrackSchema(width, height).parse(track),
    [track, width, height],
  );
  const settings = resolveMotionSettings({ ...motion, ...blurOptions });
  const shutterAngle = Math.min(
    360,
    settings.shutterAngle * settings.blurStrength,
  );
  const blur =
    enabled &&
    motionBlur &&
    shutterAngle > 0 &&
    (blurActive || isCameraMoving(validatedTrack, frame, motion));
  const sample = (
    <CameraSample
      track={validatedTrack}
      width={width}
      height={height}
      enabled={enabled}
      render={render}
      motion={motion}
    />
  );
  return (
    <CameraViewport
      blur={blur}
      samples={settings.samples}
      shutterAngle={shutterAngle}
    >
      {sample}
    </CameraViewport>
  );
}
