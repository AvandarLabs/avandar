import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HouseholdBadge } from "../HouseholdBadge";
import { HouseholdCaption } from "../HouseholdCaption";
import { HouseholdAnchor } from "./HouseholdAnchor";
import type { Input } from "../GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";

type Props = {
  household: Input["households"][number];
  index: number;
  frame: number;
  isSelected: boolean;
  accent: string;
};
/**
 * Separate keyed records retain exact map anchors, even for coincident homes.
 */
export function HouseholdMarker({
  household,
  index,
  frame,
  isSelected,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = isSelected
    ? motion.ramp(frame, 84, motion.scale(24), motion.travel.easing)
    : 0;
  const mapX = 110 + household.x * 3.8;
  const mapY = 180 + household.y * 2.7;
  const x = Motion.mix({ t: progress, from: 125 + (index % 4) * 112, to: 580 });
  const y = Motion.mix({
    t: progress,
    from: 205 + Math.floor(index / 4) * 105,
    to: 174 + index * 28,
  });
  return (
    <g>
      <HouseholdAnchor
        householdId={household.id}
        mapPoint={{ x: mapX, y: mapY }}
        badgePoint={{ x, y }}
        color={isSelected ? accent : tokens.color.inactive}
      />
      <HouseholdBadge
        {...{ household, index, frame, isSelected, x, y, accent }}
      />
      <HouseholdCaption household={household} index={index} />
    </g>
  );
}
