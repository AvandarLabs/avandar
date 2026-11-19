import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
 * Exact data at the data role's size (12 px in classic). Callers own the full single-line width.
 * Amber underlined whitespace marks preserve whole graphemes and raw aria.
 */
export function LiteralDataText({
  value,
  x,
  y,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const data = tokens.text.graphic.data;
  return (
    <text
      aria-label={value}
      data-literal-value={value}
      x={x}
      y={y}
      fontSize={data.fontSize}
      fontFamily={data.fontFamily}
      xmlSpace="preserve"
      fill={color ?? data.color}
    >
      {Array.from(GRAPHEMES.segment(value)).map(({ segment, index }) => {
        const isWhitespace = /\s/u.test(segment);
        return (
          <tspan
            key={index}
            fill={isWhitespace ? tokens.color.highlight : undefined}
            textDecoration={isWhitespace ? "underline" : undefined}
          >
            {isWhitespace
              ? segment.replace(/\s/gu, (character) => {
                  return WHITESPACE_MARKS[character] ?? "␣";
                })
              : segment}
          </tspan>
        );
      })}
    </text>
  );
}
