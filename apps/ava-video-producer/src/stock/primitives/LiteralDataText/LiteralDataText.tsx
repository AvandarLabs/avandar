import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { value: string; x: number; y: number; color?: string };
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
const WHITESPACE_MARKS: Readonly<Record<string, string>> = {
  " ": "·",
  "\t": "⇥",
  "\n": "↵",
  "\r": "␍",
};
/**
 * Exact data at a fixed 12px size. Callers own the full single-line width.
 * Amber underlined whitespace marks preserve whole graphemes and raw aria.
 */
export function LiteralDataText({
  value,
  x,
  y,
  color = STOCK.text,
}: Readonly<Props>): ReactNode {
  return (
    <text
      aria-label={value}
      data-literal-value={value}
      x={x}
      y={y}
      fontSize={12}
      fontFamily="Arial, sans-serif"
      xmlSpace="preserve"
      fill={color}
    >
      {Array.from(GRAPHEMES.segment(value)).map(({ segment, index }) => {
        const isWhitespace = /\s/u.test(segment);
        return (
          <tspan
            key={index}
            fill={isWhitespace ? STOCK.orange : undefined}
            textDecoration={isWhitespace ? "underline" : undefined}
          >
            {isWhitespace
              ? segment.replace(
                  /\s/gu,
                  (character) => WHITESPACE_MARKS[character] ?? "␣",
                )
              : segment}
          </tspan>
        );
      })}
    </text>
  );
}
