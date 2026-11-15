import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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

/**
 * Renders every authored word at one fixed size or fails before drawing.
 * The size is content, validated against measured widths; the family,
 * colour, and line spacing come from the `text.graphic.data` role.
 */
export function FitText({
  text,
  width,
  fontSize,
  maxLines,
  breakLongWords = false,
  normalizeWhitespace = false,
  x,
  y,
  color,
  anchor = "start",
}: Readonly<Props>): ReactNode {
  const data = useGraphicTokens().text.graphic.data;
  const lineHeight = data.lineHeight ?? 1.3;
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
      fill={color ?? data.color}
      fontSize={fontSize}
      fontFamily={data.fontFamily}
      textAnchor={anchor}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index ? fontSize * lineHeight : 0}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
