import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Point } from "./HouseholdMarkerShared.types";
import type { ReactNode } from "react";

type Props = {
  householdId: string;
  mapPoint: Point;
  badgePoint: Point;
  color: string;
};
/** The household's map anchor and its leader to the badge. */
export function HouseholdAnchor({
  householdId,
  mapPoint,
  badgePoint,
  color,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <>
      <circle
        data-map-household={householdId}
        cx={mapPoint.x}
        cy={mapPoint.y}
        r={3}
        fill={tokens.color.inactive}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${mapPoint.x} ${mapPoint.y} L${badgePoint.x} ${badgePoint.y}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={color}
        strokeOpacity={atomic.opacity["35"]}
      />
    </>
  );
}
