import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PocketInference.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  y: number;
  ripple: number;
};

/**
 * Returns cartridge arrival position, ripple progress, and theme values for
 * `InstalledModelCartridge`, `ModelCartridge`.
 */
export function useModelCartridgePresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const y = Motion.mix({
    t: motion.ramp(frame, 20, motion.scale(16)),
    from: 106,
    to: 130,
  });
  const ripple = motion.ramp(frame, 56, motion.scale(24));
  return { frame, input, accent, atomic, tokens, motion, scales, y, ripple };
}
