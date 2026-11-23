import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SharedReadingCircles.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns reading-circle input, frame, and theme values for
 * `SharedReadingCircles`, `ReadingShelf`.
 */
export function useSharedReadingCirclesPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { frame, input, accent, tokens, motion, scales };
}
