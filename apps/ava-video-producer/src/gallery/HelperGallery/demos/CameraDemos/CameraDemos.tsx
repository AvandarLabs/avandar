import {
  getCameraPose,
  isCameraMoving,
} from "../../../../motion-components/cameraTrack/cameraTrack";
import { DiagramCamera } from "../../../../motion-components/DiagramCamera";
import { MotionSettings } from "../../../../motion-components/MotionSettings/MotionSettings";
import { useWindowStage } from "../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { type WindowCameraKey } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion.types";
import { WINDOW_BOX } from "../../../../scenes/TiltedWindowScene/windowTilt";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../parts/DemoCanvas";
import { DemoDiagram } from "../parts/DemoDiagram";
import { getCanvasRect } from "../parts/getCanvasRect";
import { TiltedDemoWindow } from "../parts/TiltedDemoWindow";
import { CameraOverview } from "./CameraOverview";
import type { CameraKeyframe } from "../../../../motion-components/cameraTrack/cameraTrack";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";
/** Push into the filter node, read it, and pull back out. */
const TRACK: CameraKeyframe[] = [
  { at: 0, x: 480, y: 300, zoom: 1 },
  { at: 20, x: 480, y: 300, zoom: 1 },
  { at: 50, x: 470, y: 180, zoom: 2.2, ease: "push" },
  { at: 90, x: 470, y: 180, zoom: 2.2 },
  { at: 125, x: 480, y: 300, zoom: 1 },
];
/** The camera's viewBox on the 960 by 600 diagram. */
function _getViewBox(pose: { x: number; y: number; zoom: number }): string {
  const width = 960 / pose.zoom;
  const height = 600 / pose.zoom;
  return `${pose.x - width / 2} ${pose.y - height / 2} ${width} ${height}`;
}
export function CameraTrackDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const pose = getCameraPose({
    keys: TRACK,
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
      <div className={css.row}>
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
/** The same route through the camera component, with travel-only blur. */
export function DiagramCameraDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const pose = getCameraPose({
    keys: TRACK,
    frame,
    enabled: true,
    options: undefined,
    viewport: undefined,
    theme: settingsTheme,
  });
  const isMoving = isCameraMoving({
    keys: TRACK,
    frame,
    options: undefined,
    theme: settingsTheme,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<DiagramCamera track={keys} preset="balanced" render={...} />'
      readouts={[
        { name: "zoom", value: DemoTheme.formatReadout({ value: pose.zoom }) },
        { name: "blur", value: isMoving ? "shutter open" : "at rest" },
      ]}
    >
      <div className={css.centered}>
        <div className={css.cameraBox}>
          <DiagramCamera
            track={TRACK}
            preset="balanced"
            render={() => {
              return <DemoDiagram />;
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
const WINDOW_KEYS: WindowCameraKey[] = [
  { at: 0, x: 0.5, y: 0.5, zoom: 1 },
  { at: 20, x: 0.5, y: 0.5, zoom: 1 },
  { at: 45, x: 0.7, y: 0.45, zoom: 1.6, ease: "push" },
  { at: 80, x: 0.7, y: 0.45, zoom: 1.6 },
  { at: 105, x: 0.5, y: 0.5, zoom: 1 },
];
/** A push into one area of the window, scaling only the window layer. */
export function WindowCameraDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const box = getCanvasRect(WINDOW_BOX);
  const lens = WindowMotion.getWindowCamera({
    frame,
    keys: WINDOW_KEYS,
    box,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"WindowMotion.getWindowCamera({ frame, keys, box })"}
      readouts={_getWindowCameraReadouts(lens)}
    >
      <DemoCanvas>
        <div
          className={css.layer}
          style={{
            transformOrigin: `${box.x + lens.originX * box.width}px ${box.y + lens.originY * box.height}px`,
            transform: `scale(${lens.scale.toFixed(4)})`,
          }}
        >
          <TiltedDemoWindow
            box={box}
            pose={{ ...WindowMotion.getRestingPose(stage), blurX: lens.blurX }}
          />
        </div>
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

/** Formats the live readouts displayed by CameraTrackDemo. */
function _getCameraTrackReadouts({
  pose,
  frame,
  settingsTheme,
}: Readonly<{
  pose: ReturnType<typeof getCameraPose>;
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
        isCameraMoving({
          keys: TRACK,
          frame,
          options: undefined,
          theme: settingsTheme,
        }),
      ),
    },
  ];
}

/** Formats the live readouts displayed by WindowCameraDemo. */
function _getWindowCameraReadouts(
  lens: ReturnType<typeof WindowMotion.getWindowCamera>,
): DemoReadout[] {
  return [
    {
      name: "scale",
      value: DemoTheme.formatReadout({ value: lens.scale }),
    },
    {
      name: "origin",
      value: `${DemoTheme.formatReadout({ value: lens.originX })}, ${DemoTheme.formatReadout({ value: lens.originY })}`,
    },
    {
      name: "blurX",
      value: `${DemoTheme.formatReadout({ value: lens.blurX, digits: 1 })}px`,
    },
  ];
}
