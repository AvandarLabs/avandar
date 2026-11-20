import { StockRect } from "../../../../stock/primitives/StockRect/StockRect";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { DemoTheme } from "../DemoTheme";
import { DemoDiagram } from "../parts/DemoDiagram";
import { CameraDemosShared } from "./CameraDemosShared/CameraDemosShared";
import type { ReactNode } from "react";
/** An overview with the camera's viewport beside what the camera sees. */
/** The whole diagram with the camera's viewport outlined on it. */
export function CameraOverview({
  pose,
}: {
  pose: { x: number; y: number; zoom: number };
}): ReactNode {
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
