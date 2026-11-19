import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CaseKey } from "./CaseKey";
import type { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { ReactNode } from "react";

type Props = {
  position: ReturnType<typeof getCasePositionsFromInput>[number];
  frame: number;
  accent: string;
};
/**
 * A stable coordinate and visible roster key keep coincident records distinct.
 */
export function CasePin({
  position,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const { record, index, mapX, mapY, isInvestigated, isFocused } = position;
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: `M${mapX} ${mapY} L628 ${154 + index * 26}` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeOpacity={atomic.opacity["16"]}
      />
      <circle
        data-map-case={record.id}
        cx={mapX}
        cy={mapY}
        r={4}
        fill={isInvestigated ? accent : tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: mapX, cy: mapY, r: 8 }}
        profile={tokens.sketch.shape}
        data-focused-case={record.id}
        data-is-focused={isFocused}
        fill="none"
        stroke={tokens.color.highlight}
        opacity={isFocused ? motion.ramp(frame, 90, motion.hero) : 0}
      />
      <CaseKey position={position} frame={frame} accent={accent} />
      <LabelSlots
        labels={[[record.label, 660, 158 + index * 26, 282, 12, 1]]}
      />
    </g>
  );
}
