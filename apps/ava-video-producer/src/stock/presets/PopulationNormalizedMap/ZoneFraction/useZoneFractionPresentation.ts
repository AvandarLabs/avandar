import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPopulationRateFromCounts } from "../getPopulationRateFromCounts";
import type { Input } from "../PopulationNormalizedMap.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  zone: Input["zones"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  zone: Options["zone"];
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  y: number;
  rate: number;
};

/**
 * Returns zone placement, rate, and theme values for `ZoneFraction`,
 * `ZoneFractionValues`.
 */
export function useZoneFractionPresentation({
  zone,
  index,
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 170 + index * 80;
  const rate = getPopulationRateFromCounts({
    ...zone,
    rateBase: input.rateBase,
  });
  return { zone, input, frame, accent, tokens, motion, y, rate };
}
