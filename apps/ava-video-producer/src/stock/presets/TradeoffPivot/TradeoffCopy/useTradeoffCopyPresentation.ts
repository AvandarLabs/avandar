import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../TradeoffPivot.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  accent: Options["accent"];
  labels: Array<
    | { text: string; y: number; fontSize: 24; color: string; opacity: number }
    | { text: string; y: number; fontSize: 18; color: string; opacity: number }
  >;
};

/**
 * Returns tradeoff label text slots for the current frame for `TradeoffCopy`.
 */
export function useTradeoffCopyPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const labels = [
    {
      text: input.approach,
      y: 60,
      fontSize: 24 as const,
      color: tokens.color.text,
      opacity: motion.ramp(frame, 12, motion.hero),
    },
    {
      text: input.priorityStatement,
      y: 548,
      fontSize: 18 as const,
      color: tokens.color.textMuted,
      opacity: motion.reveal(frame, 108),
    },
  ];
  return { frame, accent, labels };
}
