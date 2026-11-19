import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const travel = motion.ramp(frame, 60, motion.scale(48), motion.travel.easing);
  const numMembers = input.groups.reduce((sum, group) => {
    return sum + group.members.length;
  }, 0);
  const memberIndex =
    input.groups.slice(0, groupIndex).reduce((sum, group) => {
      return sum + group.members.length;
    }, 0) + index;
  const finalX = 480 + (memberIndex - (numMembers - 1) / 2) * 90;
  const x = mix(travel, (groupIndex === 0 ? 100 : 680) + index * 90, finalX);
  const y = 390;
  const greeting = motion.ramp(
    frame,
    108,
    motion.scale(22),
    motion.travel.easing,
  );
  const stride =
    travel > 0 && travel < 1 ? Math.sin(frame * 0.5 + index) * 7 : 0;
  const side = groupIndex === 0 ? 1 : -1;
  const accepting =
    index === 0 &&
    frame >= 28 + groupIndex * motion.scaleStagger(18) &&
    frame <= 40 + groupIndex * motion.scaleStagger(18);
  const acceptProgress = motion.ramp(
    frame,
    28 + groupIndex * motion.scaleStagger(18),
    motion.whip,
    motion.travel.easing,
  );
  const handX = accepting
    ? mix(acceptProgress, x + 18, groupIndex === 0 ? 246 : 866)
    : x + side * (input.greeting === "wave" ? 22 : 34) * greeting;
  const handY = accepting
    ? mix(acceptProgress, y - 28, 282)
    : y - 28 - (input.greeting === "wave" ? 36 : 8) * greeting;
  return (
    <g data-member={member.id} data-x={x} data-y={y}>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y - 52, r: 8 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y - 42} V${y - 18} M${x} ${y - 18} L${x - 12 - stride} ${y + 7} M${x} ${y - 18} L${x + 12 + stride} ${y + 7}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        strokeLinecap="round"
        fill="none"
      />
      <g data-facing>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${y - 52} L${x + side * 9 * greeting} ${y - 52}`,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      </g>
      <g data-greeting-arm>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${y - 36} L${x + side * 16 * greeting} ${y - 30 - 12 * greeting} L${handX} ${handY} M${x} ${y - 36} L${x - side * 24 * greeting} ${y - 22 - 10 * greeting}`,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          strokeLinecap="round"
          fill="none"
        />
      </g>
      {index === 0 && frame < 60 ? (
        <g data-invitation-holding-arm>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${x} ${y - 36} L${groupIndex === 0 ? 120 : 740} 310`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
        </g>
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
