import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import type { ReactNode } from "react";

type Props = { value: string; x: number; y: number };
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
function _width(value: string): number {
  const bases = value
    .replace(
      /[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}\p{Emoji_Modifier}]/gu,
      "",
    )
    .replace(/\s/gu, "␣");
  return Math.max(
    14,
    getConservativeWidthFromText({ text: bases, fontSize: 12 }),
  );
}
/** Exact literal data wraps at whole graphemes inside an 84px cell interior. */
export function GridLiteralCell({ value, x, y }: Readonly<Props>): ReactNode {
  const lines = [{ value: "", width: 0 }];
  Array.from(GRAPHEMES.segment(value), ({ segment }) => segment).forEach(
    (segment) => {
      const width = _width(segment);
      const line = lines[lines.length - 1];
      if (line.width + width > 84) {
        lines.push({ value: segment, width });
      } else {
        line.value += segment;
        line.width += width;
      }
    },
  );
  return (
    <g data-raw-grid-value={value} aria-label={value}>
      {lines.map((line, index) => (
        <LiteralDataText
          key={index}
          value={line.value}
          x={x}
          y={y + index * 16}
        />
      ))}
    </g>
  );
}
