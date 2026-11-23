import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { x: number; anchor?: "end"; children: ReactNode };

/** The ruler's value at one end. */
export function RulerEndLabel({
  x,
  anchor,
  children,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <text
      x={x}
      y={480}
      textAnchor={anchor}
      fill={tokens.color.textMuted}
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
      fontSize={tokens.text.graphic.data.fontSize}
    >
      {children}
    </text>
  );
}
