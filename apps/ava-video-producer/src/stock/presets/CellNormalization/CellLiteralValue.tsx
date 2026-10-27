import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = {
  value: string;
  x: number;
  y: number;
  showWhitespace: boolean;
  color?: string;
  opacity?: number;
  letterSpacing?: number;
};
function _valuePresentation({
  value,
  showWhitespace,
}: {
  value: string;
  showWhitespace: boolean;
}): string {
  return showWhitespace
    ? value.replace(
        /[ \t\n\r]/g,
        (character) =>
          ({ " ": "·", "\t": "⇥", "\n": "↵", "\r": "␍" })[character] ??
          character,
      )
    : value;
}
/**
 * Whitespace substitution is presentation-only. Aria retains the exact data.
 */
export function CellLiteralValue({
  value,
  x,
  y,
  showWhitespace,
  color = STOCK.text,
  opacity = 1,
  letterSpacing = 0,
}: Readonly<Props>): ReactNode {
  return (
    <text
      aria-label={value}
      x={x}
      y={y}
      fontSize={14}
      fontFamily="Arial, sans-serif"
      xmlSpace="preserve"
      fill={color}
      opacity={opacity}
      letterSpacing={letterSpacing}
    >
      {_valuePresentation({ value, showWhitespace })}
    </text>
  );
}
