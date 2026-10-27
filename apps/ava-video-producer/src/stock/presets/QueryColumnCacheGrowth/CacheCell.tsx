import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import type { ReactNode } from "react";
type Props = {
  value: string;
  columnId: string;
  rowIndex: number;
  x: number;
  y: number;
};
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
/** Exact raw cells wrap once at eight whole graphemes without adding data. */
export function CacheCell({
  value,
  columnId,
  rowIndex,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const segments = Array.from(
    GRAPHEMES.segment(value),
    ({ segment }) => segment,
  );
  const lines = [
    segments.slice(0, 8).join(""),
    ...(segments.length > 8 ? [segments.slice(8).join("")] : []),
  ];
  return (
    <g
      data-cache-cell={columnId}
      data-row-index={rowIndex}
      data-raw-cell={value}
      aria-label={value}
    >
      {lines.map((line, index) => (
        <LiteralDataText key={index} value={line} x={x} y={y + index * 17} />
      ))}
    </g>
  );
}
