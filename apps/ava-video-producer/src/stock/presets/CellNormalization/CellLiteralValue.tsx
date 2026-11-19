import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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

/** A literal cell value's size, as content: no graphic text role is 14 px. */
const VALUE_FONT_SIZE = 14;
function _valuePresentation({
  value,
  showWhitespace,
}: {
  value: string;
  showWhitespace: boolean;
}): string {
  return showWhitespace
    ? value.replace(/[ \t\n\r]/g, (character) => {
        return (
          { " ": "·", "\t": "⇥", "\n": "↵", "\r": "␍" }[character] ?? character
        );
      })
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
  color,
  opacity = 1,
  letterSpacing = 0,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <text
      aria-label={value}
      x={x}
      y={y}
      fontSize={VALUE_FONT_SIZE}
      fontFamily={tokens.text.graphic.data.fontFamily}
      xmlSpace="preserve"
      fill={color ?? tokens.color.text}
      opacity={opacity}
      letterSpacing={letterSpacing}
    >
      {_valuePresentation({ value, showWhitespace })}
    </text>
  );
}
