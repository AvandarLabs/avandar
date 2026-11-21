import css from "./CurvePlotAxes.module.css";
import type { Scale } from "../CurvePlotGalleryValues/CurvePlotGalleryValues";
import type { ReactNode } from "react";

type Props = { size: number; scale: Scale };
/** Draws the easing plot axes, guide and reference labels. */
export function CurvePlotAxes({ size, scale }: Readonly<Props>): ReactNode {
  const { toY } = scale;
  return (
    <>
      <line
        className={css.curvePlotAxesPlotGuide}
        x1={0}
        x2={size}
        y1={toY(1)}
        y2={toY(1)}
      />
      <polyline
        className={css.curvePlotAxesPlotAxis}
        points={`0,0 0,${toY(0)} ${size},${toY(0)}`}
      />
      <text
        className={css.curvePlotAxesPlotText}
        x={-8}
        y={toY(1) + 4}
        textAnchor="end"
      >
        1
      </text>
      <text
        className={css.curvePlotAxesPlotText}
        x={-8}
        y={toY(0) + 4}
        textAnchor="end"
      >
        0
      </text>
    </>
  );
}
