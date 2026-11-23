import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { ReactNode } from "react";

type Props = {
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof getCoordinationPlaceColorFromIndex>;
  placeIndex: number;
};

/** Renders the assignment key with authored geometry. */
export function CoordinationTeamCopyAssignmentKey({
  y,
  tokens,
  color,
  placeIndex,
}: Readonly<Props>): ReactNode {
  return (
    <text
      data-assignment-key
      x={642}
      y={y + 47}
      textAnchor="middle"
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
      fontSize={tokens.text.graphic.data.fontSize}
      fill={color}
    >
      {String.fromCharCode(65 + placeIndex)}
    </text>
  );
}
