import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The axis value at one end, above the axis line. */
export function AxisEndLabel({
  x,
  anchor,
  children,
}: Readonly<{ x: number; anchor?: "end"; children: ReactNode }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={x}
      y={170}
      fill={tokens.color.text}
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
      fontSize={tokens.text.graphic.data.fontSize}
      textAnchor={anchor}
    >
      {children}
    </text>
  );
}
