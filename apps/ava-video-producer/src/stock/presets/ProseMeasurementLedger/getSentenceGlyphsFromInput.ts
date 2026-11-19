import { prop } from "@avandar/utils";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import type { Input } from "./ProseMeasurementLedger.schema";

const graphemes: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
/**
 * The sentence's measured type size. Glyph positions are laid out from
 * measured widths at this size, so it is layout, not a theme value.
 */
export const SENTENCE_FONT_SIZE = 16;
type Glyph = {
  text: string;
  x: number;
  y: number;
  start: number;
  width: number;
  end: number;
};
/** Exact UTF-16 offsets with word-aware, whole-grapheme source layout. */
export function getSentenceGlyphsFromInput(input: Readonly<Input>): Glyph[] {
  const sentence = input.fragments.map(prop("text")).join("");
  const glyphs: Glyph[] = [];
  let x = 52,
    y = 140;
  Array.from(sentence.matchAll(/\s+|\S+/gu)).forEach((match) => {
    const word = match[0];
    const width = getConservativeWidthFromText({
      text: word,
      fontSize: SENTENCE_FONT_SIZE,
    });
    if (!/^\s+$/u.test(word) && x > 52 && x + width > 908) {
      x = 52;
      y += 25;
    }
    Array.from(graphemes.segment(word)).forEach(({ segment, index }) => {
      const text = /^\s+$/u.test(segment) ? " " : segment;
      const advance = getConservativeWidthFromText({
        text,
        fontSize: SENTENCE_FONT_SIZE,
      });
      if (x + advance > 908) {
        x = 52;
        y += 25;
      }
      glyphs.push({
        text,
        x,
        y,
        start: match.index + index,
        end: match.index + index + segment.length,
        width: advance,
      });
      x += advance;
    });
  });
  return glyphs;
}
