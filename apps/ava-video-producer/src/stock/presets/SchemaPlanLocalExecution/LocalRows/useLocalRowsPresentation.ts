import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchemaPlanLocalExecution.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns execution input, frame, and theme values for
 * `getLocalExecutionRowLayout`, `LocalExecutionRow`, `LocalRows`.
 */
export function useLocalRowsPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { input, frame, accent, tokens, motion, scales };
}
