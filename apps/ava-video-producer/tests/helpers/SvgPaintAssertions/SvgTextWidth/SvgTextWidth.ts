import { getConservativeWidthFromText } from "../../../../src/stock/text/getConservativeWidthFromText";

const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});

// Widths share the reviewed Arial advances with production text fitting, so
// this
// is not an independent font oracle. Rendered strings, coordinates, transforms,
// baselines and layout rejection remain independently checked from SVG output.
function _getWidthFromText({
  text,
  fontSize,
}: Readonly<{
  text: string;
  fontSize: number;
}>): number {
  return Array.from(GRAPHEMES.segment(text)).reduce(
    (totalWidth, { segment }) => {
      const bases = Array.from(segment).filter((character) => {
        return !/[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}\p{Emoji_Modifier}]/u.test(
          character,
        );
      });
      const advance = getConservativeWidthFromText({
        text: bases.join(""),
        fontSize,
      });
      const needsFallbackFloor =
        !bases.length ||
        /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3\ufe0f]/u.test(
          segment,
        );
      return (
        totalWidth +
        Math.max(advance, needsFallbackFloor ? Math.ceil(fontSize * 1.1) : 0)
      );
    },
    0,
  );
}
/** Conservative SVG text widths for paint envelope assertions. */
export const SvgTextWidth = {
  /** Returns the painted width estimate for complete grapheme clusters. */
  fromText: _getWidthFromText,
};
