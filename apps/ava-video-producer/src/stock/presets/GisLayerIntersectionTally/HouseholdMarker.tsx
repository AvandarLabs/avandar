import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { HouseholdBadge } from "./HouseholdBadge";
import { HouseholdCaption } from "./HouseholdCaption";
import type { Input } from "./GisLayerIntersectionTally.schema";
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
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const progress = isSelected
    ? motion.ramp(frame, 84, motion.scale(24), motion.travel.easing)
    : 0;
  const mapX = 110 + household.x * 3.8;
  const mapY = 180 + household.y * 2.7;
  const x = mix(progress, 125 + (index % 4) * 112, 580);
  const y = mix(progress, 205 + Math.floor(index / 4) * 105, 174 + index * 28);
  return (
    <g>
      <circle
        data-map-household={household.id}
        cx={mapX}
        cy={mapY}
        r={3}
        fill={tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${mapX} ${mapY} L${x} ${y}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={isSelected ? accent : tokens.color.inactive}
        strokeOpacity={atomic.opacity["35"]}
      />
      <HouseholdBadge
        household={household}
        index={index}
        frame={frame}
        isSelected={isSelected}
        x={x}
        y={y}
        accent={accent}
      />
      <HouseholdCaption household={household} index={index} />
    </g>
  );
}
