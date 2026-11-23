import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { ReactNode } from "react";

type Props = {
  y: number;
  input: Input;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof getCoordinationPlaceColorFromIndex>;
};

/** Renders the surface with authored geometry. */
export function CoordinationTeamLegendMarker({
  y,
  input,
  scales,
  tokens,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={634}
      y={y - 14}
      width={16}
      height={18}
      rx={input.markerStyle === "flags" ? 0 : scales.corner(tokens.corner.chip)}
      fill={tokens.color.surface}
      stroke={color}
    />
  );
}
