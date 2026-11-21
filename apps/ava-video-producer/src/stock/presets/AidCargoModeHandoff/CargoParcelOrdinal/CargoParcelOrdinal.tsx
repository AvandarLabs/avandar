import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  parcelIndex: number;
};

/** Renders the value label with authored geometry. */
export function CargoParcelOrdinal({
  tokens,
  parcelIndex,
}: Readonly<Props>): ReactNode {
  return (
    <text
      x={6}
      y={10}
      fontFamily={tokens.text.graphic.value.fontFamily}
      fontWeight={tokens.text.graphic.value.fontWeight}
      fontSize={tokens.text.graphic.value.fontSize}
      fill={tokens.color.text}
      textAnchor="middle"
    >
      {parcelIndex + 1}
    </text>
  );
}
