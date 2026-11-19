import {
  getFontSizeFromStep,
  useGraphicFilter,
  useGraphicTheme,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import { getLetterSpacingFromTypeStyle } from "./getLetterSpacingFromTypeStyle";
import type { ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";
import type { GraphicTextRole } from "./graphicCommon.types";
import type { CSSProperties, ReactNode } from "react";

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
 * SVG text in a graphic type role (`body` unless named), for headings,
 * labels, and figures inside a stock graphic. `size` sets the text at
 * another step of the theme's type scale, such as a study heading at `29`.
 * `fittedSize` is a size measured against glyph widths, such as a word
 * fitted to its mask, and stays put when the type scale changes. `fill` is
 * a content colour, and `mono` draws in the code role's face.
 */
export function Text({
  x,
  y,
  children,
  role = "body",
  size,
  fittedSize,
  fill,
  anchor = "start",
  mono = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  role?: GraphicTextRole;
  size?: string;
  fittedSize?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
}): ReactNode {
  const text = useGraphicTokens().text.graphic;
  const theme = useGraphicTheme();
  const filter = useGraphicFilter(`text.graphic.${role}`);
  const style = text[role];
  const fontSize =
    fittedSize ??
    (size === undefined ? style.fontSize : getFontSizeFromStep(theme, size));
  return (
    <text
      x={x}
      y={y}
      filter={filter}
      fill={fill ?? style.color}
      fillOpacity={style.alpha < 1 ? style.alpha : undefined}
      fontSize={fontSize}
      fontWeight={style.fontWeight}
      textAnchor={anchor}
      fontFamily={mono ? text.code.fontFamily : style.fontFamily}
      letterSpacing={getLetterSpacingFromTypeStyle(style, fontSize)}
      stroke={style.strokeWidth ? (fill ?? style.color) : undefined}
      strokeWidth={style.strokeWidth}
      paintOrder={style.strokeWidth ? "stroke" : undefined}
      style={_textStyle(style)}
    >
      {children}
    </text>
  );
}
