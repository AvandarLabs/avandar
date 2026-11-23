import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { ReactNode } from "react";

type Props = {
  place: Input["places"][number];
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof getCoordinationPlaceColorFromIndex>;
  index: number;
};

/** Renders the place key with authored geometry. */
export function CoordinationPlaceCopyPlaceKey({
  place,
  y,
  tokens,
  color,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <text
      data-place-key={place.id}
      x={25}
      y={y}
      textAnchor="middle"
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
      fontSize={tokens.text.graphic.data.fontSize}
      fill={color}
    >
      {String.fromCharCode(65 + index)}
    </text>
  );
}
