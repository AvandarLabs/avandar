import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { StaggerCardsInput } from "../../presets/StaggerCards/StaggerCards.schema";
import type { getContentColorFromValue } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within StaggerCards. */
export type Props = GraphicProps & { input: StaggerCardsInput };
/** Rendering data shared within StaggerCards. */
export type Drawing = Props & {
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  alpha: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["alpha"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  hairline: number;
};
/** Rendering data shared within StaggerCards. */
export type CardCompletionData = Drawing & {
  card: StaggerCardsInput["cards"][number];
  cardIndex: number;
  x: number;
  y: number;
  cardColor: ReturnType<typeof getContentColorFromValue>;
  done: number;
};
