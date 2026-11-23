import { Motion } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { SceneGeometry } from "../layout/SceneGeometry";
import { TextLayout } from "../layout/TextLayout";
import type { MetricSceneProps as Props } from "../scenes.types";
import type { MetricCard } from "./MetricCard/MetricCard";
import type { ComponentProps } from "react";

type ResolvedMetricInput = Props &
  Required<
    Pick<
      Props,
      | "width"
      | "height"
      | "from"
      | "precision"
      | "countAtFrame"
      | "countDurationInFrames"
    >
  >;
/** Keeps metric validation and theme reads in their original order. */
export function useMetricScene({
  input,
}: Readonly<{ input: ResolvedMetricInput }>): ComponentProps<
  typeof MetricCard
> {
  const { from, countAtFrame, countDurationInFrames } = input;

  _assertMetricTiming({ from, countAtFrame, countDurationInFrames });
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const lineHeights = useVideoTheme().mantine.lineHeights;

  return _makeMetricStateFromScene({
    input,
    tokens,
    motion,
    scales,
    lineHeights,
  });
}
/** Fits the metric stack and samples its displayed figure. */
function _makeMetricStateFromScene({
  input,
  tokens,
  motion,
  scales,
  lineHeights,
}: Readonly<MetricStateOptions>): ComponentProps<typeof MetricCard> {
  const { width, height, title, kicker } = input;
  const bounds = SceneGeometry.sceneBounds({
    width,
    height,
    hasHeading: Boolean(title || kicker),
  });
  const layout = TextLayout.fitMetricContent({
    ...input,
    width: bounds.width,
    height: bounds.height,
  });
  const display = _getMetricDisplayFromFrame({ ...input, motion });

  return {
    ...input,
    unit: input.unit,
    tokens,
    motion,
    scales,
    lineHeights,
    scene: tokens.color.scene,
    bounds,
    layout,
    display,
  };
}

/** Rejects invalid metric count timing and starting values. */
function _assertMetricTiming({
  from,
  countAtFrame,
  countDurationInFrames,
}: Readonly<{
  from: number;
  countAtFrame: number;
  countDurationInFrames: number;
}>): void {
  SceneGeometry.assertFinite({
    value: from,
    name: "metric from",
  });
  SceneGeometry.assertFrame({
    value: countAtFrame,
    name: "countAtFrame",
  });
  SceneGeometry.assertFrame({
    value: countDurationInFrames,
    name: "countDurationInFrames",
  });
  if (!countDurationInFrames) {
    throw new Error("countDurationInFrames must be positive");
  }
}

/** Formats the interpolated metric value at one frame. */
function _getMetricDisplayFromFrame({
  frame,
  countAtFrame,
  countDurationInFrames,
  motion,
  from,
  value,
  precision,
}: Readonly<{
  frame: number;
  countAtFrame: number;
  countDurationInFrames: number;
  motion: ReturnType<typeof useVideoMotion>;
  from: number;
  value: number;
  precision: number;
}>): string {
  return TextLayout.formatMetric({
    value: Motion.mix({
      t: motion.ramp(
        frame,
        countAtFrame,
        countDurationInFrames,
        motion.reveal.easing,
      ),
      from,
      to: value,
    }),
    precision,
  });
}

type MetricStateOptions = {
  input: ResolvedMetricInput;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  lineHeights: ReturnType<typeof useVideoTheme>["mantine"]["lineHeights"];
};
