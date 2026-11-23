import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { BarRaceInput } from "../../presets/BarRace/BarRace.schema";
import type { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getRaceProgressFromFrame } from "./getRaceProgressFromFrame";

/** Rendering data shared within BarRace. */
export type Props = GraphicProps & {
  input: BarRaceInput;
};
/** Rendering data shared within BarRace. */
export type BarShapeData = {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  hairline: number;
  value: number;
  y: number;
  barColor: Props["accent"] | ReturnType<typeof getContentColorFromValue>;
};
/** Rendering data shared within BarRace. */
export type BarLegendData = {
  input: Props["input"];
  accent: Props["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  bars: Props["input"]["bars"];
};
/** Rendering data shared within BarRace. */
export type BarGridData = {
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  hairline: number;
};
/** Rendering data shared within BarRace. */
export type BarRaceFooterData = {
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  t: number;
};
/** Rendering data shared within BarRace. */
export type BarRaceHeadingData = {
  input: Props["input"];
  accent: Props["accent"];
};
/** Rendering data shared within BarRace. */
export type GetBarRaceBarsStateOptions = {
  input: Props["input"];
  frame: Props["frame"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Rendering data shared within BarRace. */
export type GetBarRaceBarsStateResult = {
  bars: Props["input"]["bars"];
  t: number;
  enter: number;
  labelOpacity: number;
  hairline: number;
};
/** Rendering data shared within BarRace. */
export type GetBarRaceValueStateOptions = {
  accent: Props["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  t: ReturnType<typeof getRaceProgressFromFrame>["t"];
  enter: ReturnType<typeof getRaceProgressFromFrame>["enter"];
  bar: ReturnType<typeof getRaceProgressFromFrame>["bars"][number];
  i: number;
};
/** Rendering data shared within BarRace. */
export type GetBarRaceValueStateResult = {
  value: number;
  y: number;
  barColor: Props["accent"] | ReturnType<typeof getContentColorFromValue>;
};
/** Rendering data shared within BarRace. */
export type RacingBarData = {
  accent: Props["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  t: ReturnType<typeof getRaceProgressFromFrame>["t"];
  enter: ReturnType<typeof getRaceProgressFromFrame>["enter"];
  labelOpacity: ReturnType<typeof getRaceProgressFromFrame>["labelOpacity"];
  hairline: ReturnType<typeof getRaceProgressFromFrame>["hairline"];
  bar: ReturnType<typeof getRaceProgressFromFrame>["bars"][number];
  i: number;
};
