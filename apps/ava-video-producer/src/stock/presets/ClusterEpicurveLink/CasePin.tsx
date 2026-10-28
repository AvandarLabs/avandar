import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
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
  const { record, index, mapX, mapY, isInvestigated, isFocused } = position;
  return (
    <g>
      <path
        d={`M${mapX} ${mapY} L628 ${154 + index * 26}`}
        stroke={STOCK.muted}
        strokeOpacity={0.16}
      />
      <circle
        data-map-case={record.id}
        cx={mapX}
        cy={mapY}
        r={4}
        fill={isInvestigated ? accent : STOCK.muted}
      />
      <circle
        data-focused-case={record.id}
        data-is-focused={isFocused}
        cx={mapX}
        cy={mapY}
        r={8}
        fill="none"
        stroke={STOCK.orange}
        opacity={isFocused ? ramp(frame, 90, 18) : 0}
      />
      <CaseKey position={position} frame={frame} accent={accent} />
      <LabelSlots
        labels={[[record.label, 660, 158 + index * 26, 282, 12, 1]]}
      />
    </g>
  );
}
