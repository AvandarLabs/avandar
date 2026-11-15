import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import type { Input } from "./UtteranceToModelDraft.schema";
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
      getConservativeWidthFromText({ text: part.text, fontSize: 12 }),
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
