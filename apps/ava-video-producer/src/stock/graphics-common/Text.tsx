import {
  useGraphicFilter,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";
import type { GraphicTextRole } from "./graphicCommon.types";
import type { CSSProperties, ReactNode } from "react";

function _letterSpacing(
  style: ResolvedTypeStyle,
  fontSize: number,
): number | undefined {
  return style.letterSpacing === undefined
    ? undefined
    : Number((style.letterSpacing * fontSize).toFixed(4));
}

function _textStyle(style: ResolvedTypeStyle): CSSProperties | undefined {
  if (!style.textTransform && !style.fontVariantNumeric) {
    return undefined;
  }
  return {
    textTransform: style.textTransform,
    fontVariantNumeric: style.fontVariantNumeric,
  };
}

/**
 * SVG text in a graphic type role (`body` unless named). `size`, `fill`,
 * `weight`, and `spacing` are content overrides; `mono` draws in the code
 * role's face. Out-of-scope presets still pass sizes; in-scope presets name
 * a role.
 */
export function Text({
  x,
  y,
  children,
  role = "body",
  size,
  fill,
  anchor = "start",
  mono = false,
  weight,
  spacing,
}: {
  x: number;
  y: number;
  children: ReactNode;
  role?: GraphicTextRole;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  weight?: number;
  spacing?: number;
}) {
  const text = useGraphicTokens().text.graphic;
  const filter = useGraphicFilter(`text.graphic.${role}`);
  const style = text[role];
  const fontSize = size ?? style.fontSize;
  return (
    <text
      x={x}
      y={y}
      filter={filter}
      fill={fill ?? style.color}
      fillOpacity={style.alpha < 1 ? style.alpha : undefined}
      fontSize={fontSize}
      fontWeight={weight ?? style.fontWeight}
      textAnchor={anchor}
      fontFamily={mono ? text.code.fontFamily : style.fontFamily}
      letterSpacing={spacing ?? _letterSpacing(style, fontSize)}
      stroke={style.strokeWidth ? (fill ?? style.color) : undefined}
      strokeWidth={style.strokeWidth}
      paintOrder={style.strokeWidth ? "stroke" : undefined}
      style={_textStyle(style)}
    >
      {children}
    </text>
  );
}
