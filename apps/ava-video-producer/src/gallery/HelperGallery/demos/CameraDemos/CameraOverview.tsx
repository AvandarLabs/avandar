import { StockRect } from "../../../../stock/primitives/StockRect";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { DemoTheme } from "../DemoTheme";
import { DemoDiagram } from "../parts/DemoDiagram/DemoDiagram";
import { CameraDemosShared } from "./CameraDemosShared/CameraDemosShared";
import type { ReactNode } from "react";

type Props = {
  pose: { x: number; y: number; zoom: number };
};

/** An overview with the camera's viewport beside what the camera sees. */
/** The whole diagram with the camera's viewport outlined on it. */
export function CameraOverview({ pose }: Readonly<Props>): ReactNode {
  const scales = useVideoShapeScales();
  const { highlight } = DemoTheme.useDemoColors();
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
        strokeWidth={scales.stroke(CameraDemosShared.VIEWPORT_STROKE)}
      />
    </svg>
  );
}
