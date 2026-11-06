import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  groupIndex: number;
  frame: number;
  accent: string;
};
/** Separate accepted invitations stay with the two authored groups. */
export function ReunionInvitation({
  input,
  groupIndex,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const x = groupIndex === 0 ? 60 : 680;
  const accepted = frame >= 36 + groupIndex * 18;
  return (
    <g data-invitation={input.groups[groupIndex].id} data-accepted={accepted}>
      <rect
        x={x}
        y={194}
        width={220}
        height={116}
        rx={6}
        fill={STOCK.surface}
        stroke={accepted ? accent : STOCK.line}
      />
      <FitText
        text={input.invitationLabels.heading}
        x={x + 14}
        y={216}
        width={192}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      {accepted ? (
        <g>
          <FitText
            text={input.invitationLabels.acceptance}
            x={x + 14}
            y={270}
            width={168}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
          <path
            data-acceptance-mark
            d={`M${x + 180} 282 l6 6 l12 -17`}
            fill="none"
            stroke={accent}
            strokeWidth={3}
          />
        </g>
      ) : undefined}
    </g>
  );
}
