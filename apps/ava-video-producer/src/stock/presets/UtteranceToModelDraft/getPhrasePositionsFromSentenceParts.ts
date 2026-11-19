import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import type { Input } from "./UtteranceToModelDraft.schema";
/**
 * The source sentence's measured type size. Fragments are placed from
 * measured widths at this size, so it is layout, not a theme value.
 */
export const SENTENCE_FONT_SIZE = 12;
/** Data for getPhrasePositionsFromSentenceParts. */
type GetPhrasePositionsResult = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
};

/**
 * Whole source fragments retain authored order on fixed-width sentence lines.
 */
export function getPhrasePositionsFromSentenceParts(
  parts: Readonly<Input["sentenceParts"]>,
): GetPhrasePositionsResult[] {
  return parts.reduce<GetPhrasePositionsResult[]>((placed, part) => {
    const previous = placed.at(-1);
    const width = Math.max(
      12,
      getConservativeWidthFromText({
        text: part.text,
        fontSize: SENTENCE_FONT_SIZE,
      }),
    );
    const candidate = previous ? previous.x + previous.width : 60;
    const wraps = candidate + width > 900;
    return [
      ...placed,
      {
        ...part,
        width,
        x: wraps ? 60 : candidate,
        y: (previous?.y ?? 115) + (wraps ? 38 : 0),
      },
    ];
  }, []);
}
