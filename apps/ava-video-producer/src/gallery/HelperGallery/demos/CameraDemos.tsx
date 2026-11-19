import {
  getCameraPose,
  isCameraMoving,
} from "../../../motion-components/cameraTrack";
import { DiagramCamera } from "../../../motion-components/DiagramCamera";
import { useMotionSettingsTheme } from "../../../motion-components/motionSettings";
import { useWindowStage } from "../../../scenes/TiltedWindowScene/useWindowStage";
import {
  getRestingPose,
  getWindowCamera,
} from "../../../scenes/TiltedWindowScene/windowMotion";
import { WINDOW_BOX } from "../../../scenes/TiltedWindowScene/windowTilt";
import { StockRect } from "../../../stock/primitives/StockRect/StockRect";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import css from "./demos.module.css";
import { formatReadout, useDemoColors } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "./parts/DemoCanvas";
import { DemoDiagram } from "./parts/DemoDiagram";
import { getCanvasRect } from "./parts/getCanvasRect";
import { TiltedDemoWindow } from "./parts/TiltedDemoWindow";
import type { CameraKeyframe } from "../../../motion-components/cameraTrack";
import type { WindowCameraKey } from "../../../scenes/TiltedWindowScene/windowMotion";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** Push into the filter node, read it, and pull back out. */
const TRACK: CameraKeyframe[] = [
  { at: 0, x: 480, y: 300, zoom: 1 },
  { at: 20, x: 480, y: 300, zoom: 1 },
  { at: 50, x: 470, y: 180, zoom: 2.2, ease: "push" },
  { at: 90, x: 470, y: 180, zoom: 2.2 },
  { at: 125, x: 480, y: 300, zoom: 1 },
];
/** The viewport outline's width on the 960 by 600 overview, in pixels. */
const VIEWPORT_STROKE = 8;

/** The camera's viewBox on the 960 by 600 diagram. */
function _getViewBox(pose: { x: number; y: number; zoom: number }): string {
  const width = 960 / pose.zoom;
  const height = 600 / pose.zoom;
  return `${pose.x - width / 2} ${pose.y - height / 2} ${width} ${height}`;
}

/** An overview with the camera's viewport beside what the camera sees. */
/** The whole diagram with the camera's viewport outlined on it. */
function CameraOverview({
  pose,
}: {
  pose: { x: number; y: number; zoom: number };
}) {
  const scales = useVideoShapeScales();
  const { highlight } = useDemoColors();
  const viewWidth = 960 / pose.zoom;
  const viewHeight = 600 / pose.zoom;
  return (
    <svg viewBox="0 0 960 600" width={320} height={200} aria-hidden="true">
      <DemoDiagram />
      <StockRect
        x={pose.x - viewWidth / 2}
        y={pose.y - viewHeight / 2}
        width={viewWidth}
        height={viewHeight}
        fill="none"
        stroke={highlight}
        strokeWidth={scales.stroke(VIEWPORT_STROKE)}
      />
    </svg>
  );
}

export function CameraTrackDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const settingsTheme = useMotionSettingsTheme();
  const pose = getCameraPose(
    TRACK,
    frame,
    true,
    undefined,
    undefined,
    settingsTheme,
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getCameraPose(keys, frame)"
      readouts={[
        { name: "x", value: formatReadout(pose.x, 1) },
        { name: "y", value: formatReadout(pose.y, 1) },
        { name: "zoom", value: formatReadout(pose.zoom) },
        {
          name: "moving",
          value: String(isCameraMoving(TRACK, frame, undefined, settingsTheme)),
        },
      ]}
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
  const settingsTheme = useMotionSettingsTheme();
  const pose = getCameraPose(
    TRACK,
    frame,
    true,
    undefined,
    undefined,
    settingsTheme,
  );
  const isMoving = isCameraMoving(TRACK, frame, undefined, settingsTheme);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<DiagramCamera track={keys} preset="balanced" render={...} />'
      readouts={[
        {
          name: "zoom",
          value: formatReadout(pose.zoom),
        },
        {
          name: "blur",
          value: isMoving ? "shutter open" : "at rest",
        },
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
  const lens = getWindowCamera(frame, WINDOW_KEYS, box, stage);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getWindowCamera(frame, keys, box)"
      readouts={[
        { name: "scale", value: formatReadout(lens.scale) },
        {
          name: "origin",
          value: `${formatReadout(lens.originX)}, ${formatReadout(lens.originY)}`,
        },
        { name: "blurX", value: `${formatReadout(lens.blurX, 1)}px` },
      ]}
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
            pose={{ ...getRestingPose(stage), blurX: lens.blurX }}
          />
        </div>
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
