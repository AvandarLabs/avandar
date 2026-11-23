import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the value label with authored geometry. */
export function CarbonNetSubtractionMark({
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <text
      x={658}
      y={515}
      fill={tokens.color.text}
      fontFamily={tokens.text.graphic.secondary.fontFamily}
      fontWeight={tokens.text.graphic.secondary.fontWeight}
      fontSize={tokens.text.graphic.secondary.fontSize}
    >
      −
    </text>
  );
}
