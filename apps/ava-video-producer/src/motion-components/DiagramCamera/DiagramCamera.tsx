import { useValidatedCameraTrack } from "./useValidatedCameraTrack";
import type { MotionOptions } from "../MotionSettings/MotionSettings";
import type { DiagramCameraProps as Props } from "./DiagramCamera.types";

export type { DiagramCameraProps } from "./DiagramCamera.types";
import { useCurrentFrame } from "remotion";
import { CameraTrack } from "../CameraTrack/CameraTrack";
import { MotionSettings } from "../MotionSettings/MotionSettings";
import { CameraSample } from "./CameraSample/CameraSample";
import { CameraViewport } from "./CameraViewport/CameraViewport";
import type { ReactNode } from "react";

type CameraBlurOptions = {
  motion: MotionOptions;
  blurOptions: Props["blurOptions"];
  enabled: boolean;
  motionBlur: boolean;
  blurActive: boolean;
  track: ReturnType<typeof useValidatedCameraTrack>;
  frame: number;
  theme: ReturnType<typeof MotionSettings.useMotionSettingsTheme>;
};
/** The shutter settings and whether this frame needs vector-camera samples. */
function _getCameraBlurSettings({
  motion,
  blurOptions,
  enabled,
  motionBlur,
  blurActive,
  track: validatedTrack,
  frame,
  theme,
}: Readonly<CameraBlurOptions>): {
  blur: boolean;
  samples: number;
  shutterAngle: number;
} {
  const settings = MotionSettings.resolveMotionSettings({
    options: { ...motion, ...blurOptions },
    theme,
  });
  const shutter = settings.shutterAngle * settings.blurStrength;
  const shutterAngle = Math.min(360, shutter);
  const blur =
    enabled &&
    motionBlur &&
    shutterAngle > 0 &&
    (blurActive ||
      CameraTrack.isMoving({
        keys: validatedTrack,
        frame,
        options: motion,
        theme,
      }));
  return { blur, samples: settings.samples, shutterAngle };
}

/**
 * Vector-only camera. The render callback receives the real, fractional content
 * frame.
 */

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
}: Readonly<Props>): ReactNode {
  const frame = useCurrentFrame();
  const validatedTrack = useValidatedCameraTrack({ track, width, height });
  const theme = MotionSettings.useMotionSettingsTheme();
  const { blur, samples, shutterAngle } = _getCameraBlurSettings({
    motion,
    blurOptions,
    enabled,
    motionBlur,
    blurActive,
    track: validatedTrack,
    frame,
    theme,
  });
  return (
    <CameraViewport blur={blur} samples={samples} shutterAngle={shutterAngle}>
      <CameraSample
        track={validatedTrack}
        width={width}
        height={height}
        enabled={enabled}
        render={render}
        motion={motion}
      />
    </CameraViewport>
  );
}
