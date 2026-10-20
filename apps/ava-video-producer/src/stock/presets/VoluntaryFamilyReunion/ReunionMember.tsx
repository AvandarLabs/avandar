import { EASE, mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";
type Props = {
  member: Input["groups"][number]["members"][number];
  index: number;
  groupIndex: number;
  input: Input;
  frame: number;
  accent: string;
};
/** Every member keeps an individual body, travel lane and greeting gesture. */
export function ReunionMember({
  member,
  index,
  groupIndex,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const travel = ramp(frame, 60, 48, EASE.inOut);
  const numMembers = input.groups.reduce(
    (sum, group) => sum + group.members.length,
    0,
  );
  const memberIndex =
    input.groups
      .slice(0, groupIndex)
      .reduce((sum, group) => sum + group.members.length, 0) + index;
  const finalX = 480 + (memberIndex - (numMembers - 1) / 2) * 90;
  const x = mix(travel, (groupIndex === 0 ? 100 : 680) + index * 90, finalX);
  const y = 390;
  const greeting = ramp(frame, 108, 22, EASE.inOut);
  const stride =
    travel > 0 && travel < 1 ? Math.sin(frame * 0.5 + index) * 7 : 0;
  const side = groupIndex === 0 ? 1 : -1;
  const accepting =
    index === 0 &&
    frame >= 28 + groupIndex * 18 &&
    frame <= 40 + groupIndex * 18;
  const acceptProgress = ramp(frame, 28 + groupIndex * 18, 8, EASE.inOut);
  const handX = accepting
    ? mix(acceptProgress, x + 18, groupIndex === 0 ? 246 : 866)
    : x + side * (input.greeting === "wave" ? 22 : 34) * greeting;
  const handY = accepting
    ? mix(acceptProgress, y - 28, 282)
    : y - 28 - (input.greeting === "wave" ? 36 : 8) * greeting;
  return (
    <g data-member={member.id} data-x={x} data-y={y}>
      <circle
        cx={x}
        cy={y - 52}
        r={8}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <path
        d={`M${x} ${y - 42} V${y - 18} M${x} ${y - 18} L${x - 12 - stride} ${y + 7} M${x} ${y - 18} L${x + 12 + stride} ${y + 7}`}
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        data-facing
        d={`M${x} ${y - 52} L${x + side * 9 * greeting} ${y - 52}`}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        data-greeting-arm
        d={`M${x} ${y - 36} L${x + side * 16 * greeting} ${y - 30 - 12 * greeting} L${handX} ${handY} M${x} ${y - 36} L${x - side * 24 * greeting} ${y - 22 - 10 * greeting}`}
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      {index === 0 && frame < 60 ? (
        <path
          data-invitation-holding-arm
          d={`M${x} ${y - 36} L${groupIndex === 0 ? 120 : 740} 310`}
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      ) : undefined}
      <circle
        data-accepting-hand={accepting ? "" : undefined}
        cx={handX}
        cy={handY}
        r={3}
        fill={accent}
      />
      {input.showMemberLabels ? (
        <FitText
          text={member.label}
          x={x}
          y={444}
          width={82}
          fontSize={12}
          maxLines={5}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      ) : undefined}
    </g>
  );
}
