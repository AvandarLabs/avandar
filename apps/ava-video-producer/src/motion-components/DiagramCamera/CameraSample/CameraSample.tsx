import { useCurrentFrame } from "remotion";
import { CameraTrack } from "../../CameraTrack/CameraTrack";
import { MotionSettings } from "../../MotionSettings/MotionSettings";
import css from "./CameraSample.module.css";
import type { CameraSampleProps as Props } from "../DiagramCamera.types";
import type { ReactNode } from "react";
/** Renders a camera sample. */
export function CameraSample({
  track,
  width,
  height,
  enabled,
  render,
  motion,
}: Readonly<Props>): ReactNode {
  const frame = useCurrentFrame();
  const theme = MotionSettings.useMotionSettingsTheme();
  const pose = CameraTrack.getPose({
    keys: track,
    frame,
    enabled,
    options: motion,
    viewport: { width, height },
    theme,
  });
  const visibleWidth = width / pose.zoom;
  const visibleHeight = height / pose.zoom;
  return (
    <svg
      className={css.cameraSampleRoot}
      viewBox={`${pose.x - visibleWidth / 2} ${pose.y - visibleHeight / 2} ${visibleWidth} ${visibleHeight}`}
    >
      {render(frame)}
    </svg>
  );
}
