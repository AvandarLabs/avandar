import { prop } from "@avandar/utils";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPhrasePositionsFromSentenceParts } from "../getPhrasePositionsFromSentenceParts";
import type { Input } from "../UtteranceToModelDraft.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  frame: number;
  input: Input;
  accent: string;
  background: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  background: Options["background"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  mapped: Set<string>;
  parts: ReturnType<typeof getPhrasePositionsFromSentenceParts>;
};

/**
 * Returns mapped sentence part identities, phrase positions, and theme values
 * for `SourceSentence`, `SourceSentenceBacking`.
 */
export function useSourceSentencePresentation({
  frame,
  input,
  accent,
  background,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const mapped = new Set(
    [
      ...input.draft.entities,
      ...input.draft.relationships,
      ...input.draft.attributes,
    ].map(prop("partId")),
  );
  const parts = getPhrasePositionsFromSentenceParts(input.sentenceParts);
  return {
    frame,
    input,
    accent,
    background,
    tokens,
    motion,
    scales,
    mapped,
    parts,
  };
}
