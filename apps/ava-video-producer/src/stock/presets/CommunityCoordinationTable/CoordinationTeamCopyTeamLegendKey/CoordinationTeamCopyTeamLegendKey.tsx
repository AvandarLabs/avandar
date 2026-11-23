import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  y: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  index: number;
};

/** Renders the team legend key with authored geometry. */
export function CoordinationTeamCopyTeamLegendKey({
  y,
  tokens,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <text
      data-team-legend-key
      x={642}
      y={y}
      textAnchor="middle"
      fontFamily={tokens.text.graphic.data.fontFamily}
      fontWeight={tokens.text.graphic.data.fontWeight}
      fontSize={tokens.text.graphic.data.fontSize}
      fill={tokens.color.text}
    >
      {index + 1}
    </text>
  );
}
