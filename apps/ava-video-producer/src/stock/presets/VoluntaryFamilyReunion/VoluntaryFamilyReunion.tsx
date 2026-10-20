import { STOCK, type GraphicProps } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { ReunionInvitation } from "./ReunionInvitation";
import { ReunionMember } from "./ReunionMember";
import { DEFAULT_INPUT } from "./VoluntaryFamilyReunion.fixtures";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Independent voluntary acceptance precedes travel and an individual greeting.
 */
export function VoluntaryFamilyReunion({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const numMembers = input.groups.reduce(
    (sum, group) => sum + group.members.length,
    0,
  );
  const halfWidth = (numMembers - 1) * 45 + 35;
  return (
    <g>
      <path
        d={`M70 405 H890 M${480 - halfWidth} 340 V405 M${480 + halfWidth} 340 V405 M${470 - halfWidth} 340 L480 310 L${490 + halfWidth} 340`}
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <FitText
        text={input.meetingLabel}
        x={480}
        y={62}
        width={820}
        fontSize={16}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      {input.groups.map((group, groupIndex) => (
        <g key={group.id}>
          <FitText
            text={group.label}
            x={groupIndex === 0 ? 60 : 580}
            y={132}
            width={320}
            fontSize={14}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
          <ReunionInvitation
            input={input}
            groupIndex={groupIndex}
            frame={frame}
            accent={groupIndex === 0 ? accent : STOCK.orange}
          />
          {group.members.map((member, index) => (
            <ReunionMember
              key={member.id}
              member={member}
              index={index}
              groupIndex={groupIndex}
              input={input}
              frame={frame}
              accent={groupIndex === 0 ? accent : STOCK.orange}
            />
          ))}
        </g>
      ))}
      <FitText
        text={input.scenarioCaption}
        x={50}
        y={570}
        width={860}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
