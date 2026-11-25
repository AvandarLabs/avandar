import { SketchedShape } from "../../../../stock/primitives/SketchedShape";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../DemoTheme";
import css from "./LoopSeries.module.css";
import type { ReactNode } from "react";

/** Width and height of the value-over-time plots beside each loop. */
const PLOT = { width: 420, height: 160 };

type Props = {
  frame: number;
  frames: number;
  sample: (frame: number) => number;
};

/** Samples a loop into the SVG path used by its value-over-time plot. */
function _makeSeriesPathFromSampler({
  frames,
  sample,
}: Pick<Props, "frames" | "sample">): string {
  return Array.from({ length: frames }, (_, index) => {
    const x = (index / (frames - 1)) * PLOT.width;
    const y = PLOT.height - sample(index) * PLOT.height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" L");
}

/** Renders LoopSeries for live helper catalog previews. */
export function LoopSeries({
  frame,
  frames,
  sample,
}: Readonly<Props>): ReactNode {
  const { stroke, sketch } = useVideoTokens();
  const scales = useVideoShapeScales();
  const colors = DemoTheme.useDemoColors();
  const seriesPath = `M${_makeSeriesPathFromSampler({ frames, sample })}`;
  const playheadX = (frame / (frames - 1)) * PLOT.width;
  return (
    <svg
      width={PLOT.width}
      height={PLOT.height}
      className={css.loopSeriesLoopPlot}
      aria-hidden="true"
    >
      <SketchedShape
        shape={{ kind: "path", d: seriesPath }}
        profile={sketch.shape}
        fill="none"
        stroke={colors.accent}
        strokeWidth={scales.stroke(stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "line",
          x1: playheadX,
          y1: 0,
          x2: playheadX,
          y2: PLOT.height,
        }}
        profile={sketch.shape}
        stroke={colors.highlight}
        strokeWidth={scales.stroke(stroke.default)}
      />
      <circle
        cx={playheadX}
        cy={PLOT.height - sample(frame) * PLOT.height}
        r={7}
        fill={colors.highlight}
      />
    </svg>
  );
}
