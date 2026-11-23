import { Motion } from "../../../motion";
import { getChartPointFromValue } from "./getChartPointFromValue";
import { TRACE_AT, TRACE_FRAMES } from "./LineTrace.constants";
import type { LineTraceInput } from "../../presets/LineTrace/LineTrace.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { TraceGeometry } from "./LineTrace.types";

/** A continuous SVG path through the supplied chart coordinates. */
function _makeSvgPathFromPoints(
  points: ReadonlyArray<ReturnType<typeof getChartPointFromValue>>,
): string {
  return points
    .map((point, index) => {
      return `${index ? "L" : "M"}${point.x} ${point.y}`;
    })
    .join(" ");
}

/** Inputs used to sample the trace geometry at an authored frame. */
type TraceOptions = {
  input: LineTraceInput;
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Supplies LineTrace with frame-specific rendering geometry or progress. */
export function getTraceGeometryFromFrame({
  input,
  frame,
  motion,
}: Readonly<TraceOptions>): TraceGeometry {
  const points = input.points.map((value, index) => {
    return getChartPointFromValue({
      value,
      index,
      pointCount: input.points.length,
    });
  });
  const referencePoints = input.reference.map((value, index) => {
    return getChartPointFromValue({
      value,
      index,
      pointCount: input.points.length,
    });
  });
  const tracePath = _makeSvgPathFromPoints(points);
  const referencePath = _makeSvgPathFromPoints(referencePoints);
  const tracePosition =
    motion.ramp(
      frame,
      TRACE_AT,
      motion.scale(TRACE_FRAMES),
      motion.travel.easing,
    ) *
    (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(tracePosition));
  const between = tracePosition - index;
  const head = {
    x: Motion.mix({
      t: between,
      from: points[index].x,
      to: points[index + 1].x,
    }),
    y: Motion.mix({
      t: between,
      from: points[index].y,
      to: points[index + 1].y,
    }),
  };
  return { points, tracePath, referencePath, head };
}
