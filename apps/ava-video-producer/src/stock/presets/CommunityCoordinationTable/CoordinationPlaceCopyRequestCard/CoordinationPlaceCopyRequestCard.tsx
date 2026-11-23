import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { ReactNode } from "react";

type Props = {
  place: Input["places"][number];
  index: number;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  color: ReturnType<typeof getCoordinationPlaceColorFromIndex>;
  frame: number;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the request card with authored geometry. */
export function CoordinationPlaceCopyRequestCard({
  place,
  index,
  scales,
  tokens,
  color,
  frame,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-request-card={place.id}
      x={36}
      y={158 + 108 * index}
      width={284}
      height={54}
      rx={scales.corner(tokens.corner.chip)}
      fill="none"
      stroke={color}
      strokeOpacity={frame >= 108 ? atomic.opacity["80"] : atomic.opacity["30"]}
    />
  );
}
