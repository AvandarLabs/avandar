import { STOCK } from "../../stockPalette";
import { type TextBounds, wrapTextToLines } from "./wrapTextToLines";
import type { ReactNode } from "react";
/** Data for Props. */
type PropsResult = {
  x: number;
  y: number;
  color?: string;
  anchor?: "start" | "middle" | "end";
};

type Props = TextBounds & PropsResult;

/** Renders every authored word at one fixed size or fails before drawing. */
export function FitText({
  text,
  width,
  fontSize,
  maxLines,
  breakLongWords = false,
  normalizeWhitespace = false,
  x,
  y,
  color = STOCK.text,
  anchor = "start",
}: Readonly<Props>): ReactNode {
  const lines = wrapTextToLines({
    text,
    width,
    fontSize,
    maxLines,
    breakLongWords,
    normalizeWhitespace,
  });
  return (
    <text
      aria-label={normalizeWhitespace ? text : undefined}
      x={x}
      y={y}
      fill={color}
      fontSize={fontSize}
      fontFamily="Arial, sans-serif"
      textAnchor={anchor}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index ? fontSize * 1.3 : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
