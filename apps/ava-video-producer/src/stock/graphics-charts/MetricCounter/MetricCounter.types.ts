import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { MetricCounterInput } from "../../presets/MetricCounter/MetricCounter.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within MetricCounter. */
export type Props = GraphicProps & {
  input: MetricCounterInput;
};
/** Rendering data shared within MetricCounter. */
export type MetricBarsData = {
  input: Props["input"];
  frame: Props["frame"];
  accent: Props["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  corner: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["corner"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  bars: Props["input"]["bars"];
};
/** Rendering data shared within MetricCounter. */
export type MetricFigureData = {
  input: Props["input"];
  frame: Props["frame"];
  accent: Props["accent"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  value: number;
};
/** Rendering data shared within MetricCounter. */
export type MetricHeadingData = { accent: Props["accent"] };
/** Rendering data shared within MetricCounter. */
export type GetMetricCounterBarsAndValueOptions = {
  input: Props["input"];
  frame: Props["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Rendering data shared within MetricCounter. */
export type GetMetricCounterBarsAndValueResult = {
  bars: Props["input"]["bars"];
  value: number;
};
