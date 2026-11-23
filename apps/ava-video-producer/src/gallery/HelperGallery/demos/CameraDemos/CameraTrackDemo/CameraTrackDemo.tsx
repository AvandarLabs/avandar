import { CameraTrack } from "../../../../../motion-components/CameraTrack/CameraTrack";
import { MotionSettings } from "../../../../../motion-components/MotionSettings/MotionSettings";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoDiagram } from "../../parts/DemoDiagram/DemoDiagram";
import { CameraDemosGalleryValues } from "../CameraDemosGalleryValues/CameraDemosGalleryValues";
import { CameraOverview } from "../CameraOverview";
import css from "./CameraTrackDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** The camera's viewBox on the 960 by 600 diagram. */
function _getViewBox(pose: { x: number; y: number; zoom: number }): string {
  const width = 960 / pose.zoom;
  const height = 600 / pose.zoom;
  return `${pose.x - width / 2} ${pose.y - height / 2} ${width} ${height}`;
}

/** Formats the live readouts displayed by CameraTrackDemo. */
function _getCameraTrackReadouts({
  pose,
  frame,
  settingsTheme,
}: Readonly<{
  pose: ReturnType<typeof CameraTrack.getPose>;
  frame: number;
  settingsTheme: ReturnType<typeof MotionSettings.useMotionSettingsTheme>;
}>): DemoReadout[] {
  return [
    {
      name: "x",
      value: DemoTheme.formatReadout({ value: pose.x, digits: 1 }),
    },
    {
      name: "y",
      value: DemoTheme.formatReadout({ value: pose.y, digits: 1 }),
    },
    { name: "zoom", value: DemoTheme.formatReadout({ value: pose.zoom }) },
    {
      name: "moving",
      value: String(
        CameraTrack.isMoving({
          keys: CameraDemosGalleryValues.TRACK,
          frame,
          options: undefined,
          theme: settingsTheme,
        }),
      ),
    },
  ];
}

/** Renders CameraTrackDemo with the authored gallery behavior. */
export function CameraTrackDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const pose = CameraTrack.getPose({
    keys: CameraDemosGalleryValues.TRACK,
    frame,
    enabled: true,
    options: undefined,
    viewport: undefined,
    theme: settingsTheme,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"getCameraPose({ keys, frame })"}
      readouts={_getCameraTrackReadouts({ pose, frame, settingsTheme })}
    >
      <div className={css.cameraTrackDemoRow}>
        <CameraOverview pose={pose} />
        <svg
          viewBox={_getViewBox(pose)}
          width={540}
          height={338}
          aria-hidden="true"
        >
          <DemoDiagram />
        </svg>
      </div>
    </HelperDemoFrame>
  );
}
