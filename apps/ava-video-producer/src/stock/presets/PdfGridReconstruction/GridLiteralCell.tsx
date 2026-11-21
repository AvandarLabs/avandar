import { prop } from "@avandar/utils";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { value: string; x: number; y: number };
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
/** A grapheme's width at the data size `LiteralDataText` draws with. */
function _width({
  value,
  fontSize,
}: Readonly<{ value: string; fontSize: number }>): number {
  const bases = value
    .replace(
      /[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}\p{Emoji_Modifier}]/gu,
      "",
    )
    .replace(/\s/gu, "␣");
  return Math.max(14, getConservativeWidthFromText({ text: bases, fontSize }));
}
/** Exact literal data wraps at whole graphemes inside an 84px cell interior. */
export function GridLiteralCell({ value, x, y }: Readonly<Props>): ReactNode {
  const { fontSize } = GraphicThemeHooks.useGraphicTokens().text.graphic.data;
  const lines = [{ value: "", width: 0 }];
  Array.from(GRAPHEMES.segment(value), prop("segment")).forEach((segment) => {
    const width = _width({ value: segment, fontSize });
    const line = lines[lines.length - 1];
    if (line.width + width > 84) {
      lines.push({ value: segment, width });
    } else {
      line.value += segment;
      line.width += width;
    }
  });
  return (
    <g data-raw-grid-value={value} aria-label={value}>
      {lines.map((line, index) => {
        return (
          // prettier-ignore
          // Grapheme wrapping creates fixed text-line slots within
          // one cell. Duplicate literal lines must remain valid.
          // react-doctor-disable-next-line no-array-index-as-key
          <LiteralDataText key={index}
            value={line.value}
            x={x}
            y={y + index * 16}
          />
        );
      })}
    </g>
  );
}
