import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../VoluntaryFamilyReunion.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  groupIndex: number;
  frame: number;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  groupIndex: Options["groupIndex"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  accepted: boolean;
};

/**
 * Returns invitation placement, acceptance state, and theme values for
 * `ReunionAcceptance`, `ReunionInvitation`.
 */
export function useReunionInvitationPresentation({
  input,
  groupIndex,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = groupIndex === 0 ? 60 : 680;
  const accepted = frame >= 36 + groupIndex * 18;
  return { input, groupIndex, accent, tokens, scales, x, accepted };
}
