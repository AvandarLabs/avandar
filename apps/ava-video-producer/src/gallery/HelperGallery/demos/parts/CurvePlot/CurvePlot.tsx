import css from "./CurvePlot.module.css";
import { CurvePlotAxes } from "./CurvePlotAxes/CurvePlotAxes";
import { CurvePlotGalleryValues } from "./CurvePlotGalleryValues/CurvePlotGalleryValues";
import { PlotHandles } from "./PlotHandles/PlotHandles";
import type { Scale } from "./CurvePlotGalleryValues/CurvePlotGalleryValues";
import type { ReactNode } from "react";

type Props = {
  easing: (t: number) => number;
  /** Linear time through the curve, 0 to 1. */
  t: number;
  size: number;
  /** Bezier control points to draw as handles, for a custom curve. */
  handles?: readonly [number, number, number, number];
};

const SAMPLES = 80;

/** The curve's polyline points from time 0 to `limit`. */
function _buildPoints({
  easing,
  scale,
  limit,
}: Readonly<{
  easing: (t: number) => number;
  scale: Scale;
  limit: number;
}>): string {
  return Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const time = (index / SAMPLES) * limit;
    return `${scale.toX(time).toFixed(2)},${scale.toY(easing(time)).toFixed(2)}`;
  }).join(" ");
}

/**
 * A plotted easing curve: time on X, eased value on Y, the curve drawn in
 * full, the travelled part highlighted, and a dot at the current value.
 */
export function CurvePlot({
  easing,
  t,
  size,
  handles,
}: Readonly<Props>): ReactNode {
  const scale = CurvePlotGalleryValues.makeScaleFromSize(size);
  const { toX, toY } = scale;
  return (
    <svg
      className={css.curvePlotPlot}
      width={size}
      height={size}
      aria-hidden="true"
    >
      <CurvePlotAxes size={size} scale={scale} />
      {handles ? <PlotHandles handles={handles} scale={scale} /> : null}
      <polyline
        className={css.curvePlotPlotCurve}
        points={_buildPoints({
          easing,
          scale,
          limit: 1,
        })}
      />
      <polyline
        className={css.curvePlotPlotTrail}
        points={_buildPoints({
          easing,
          scale,
          limit: t,
        })}
      />
      <circle
        className={css.curvePlotPlotDot}
        cx={toX(t)}
        cy={toY(easing(t))}
        r={8}
      />
    </svg>
  );
}
