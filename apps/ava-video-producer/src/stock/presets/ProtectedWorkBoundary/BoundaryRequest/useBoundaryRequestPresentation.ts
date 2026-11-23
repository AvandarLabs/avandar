import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getRequestPositionFromInputAndFrame } from "../getRequestPositionFromInputAndFrame";
import type { Input } from "../ProtectedWorkBoundary.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { frame: number; input: Input; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  position: ReturnType<typeof getRequestPositionFromInputAndFrame>;
};

/**
 * Returns boundary request position and theme values for
 * `BoundaryRequestLabel`, `BoundaryRequest`.
 */
export function useBoundaryRequestPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const position = getRequestPositionFromInputAndFrame({
    motion,
    frame,
    input,
  });
  return { frame, input, accent, tokens, motion, scales, position };
}
