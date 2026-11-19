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
      fontSize={tokens.text.graphic.value.fontSize}
      fontFamily={tokens.text.graphic.value.fontFamily}
      fontWeight={tokens.text.graphic.value.fontWeight}
      xmlSpace="preserve"
      fill={color ?? tokens.text.graphic.value.color}
      opacity={opacity}
      letterSpacing={letterSpacing}
    >
      {_valuePresentation({ value, showWhitespace })}
    </text>
  );
}
