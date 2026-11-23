import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ProtectedWorkBoundary.schema";

/** Frame-driven finite schedule and authored request disposition. */
export /** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  id: Options["id"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns boundary identity and theme values for `ProtectedBoundaryPattern`,
 * `ProtectedWorkBoundary`.
 */
export function useProtectedWorkBoundaryPresentation({
  frame,
  input,
  accent,
  id,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { frame, input, accent, id, tokens, scales };
}
