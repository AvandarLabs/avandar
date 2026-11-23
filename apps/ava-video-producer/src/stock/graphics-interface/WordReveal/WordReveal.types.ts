import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { WordRevealInput } from "../../presets/WordReveal/WordReveal.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within WordReveal. */
export type Props = GraphicProps & { input: WordRevealInput };
/** Rendering data shared within WordReveal. */
export type PositionedWord = WordRevealInput["words"][number] & {
  x: number;
  y: number;
  size: number;
  width: number;
  at: number;
};
/** Rendering data shared within WordReveal. */
export type Drawing = Props & {
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  sketch: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["sketch"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  words: PositionedWord[];
};
