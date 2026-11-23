import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReunionHandFromFrame } from "../getReunionHandFromFrame";
import { ReunionMemberContent } from "./ReunionMemberContent";
import type { Input } from "../VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type Props = {
  member: Input["groups"][number]["members"][number];
  index: number;
  groupIndex: number;
  input: Input;
  frame: number;
  accent: string;
};

type GetReunionMemberXStateOptions = {
  index: Readonly<Props>["index"];
  groupIndex: Readonly<Props>["groupIndex"];
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  travel: number;
  numMembers: number;
  memberIndex: number;
};

type GetReunionMemberXStateResult = {
  x: number;
  y: number;
  greeting: number;
  stride: number;
  side: number;
  accepting: ReturnType<typeof getReunionHandFromFrame>["accepting"];
  handX: ReturnType<typeof getReunionHandFromFrame>["handX"];
  handY: ReturnType<typeof getReunionHandFromFrame>["handY"];
};

/** Samples the member's global travel order across the authored groups. */
function _getMemberTravelOrder({
  input,
  frame,
  groupIndex,
  index,
  motion,
}: Readonly<
  Pick<Props, "input" | "frame" | "groupIndex" | "index"> & {
    motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  }
>): { travel: number; numMembers: number; memberIndex: number } {
  const travel = motion.ramp(frame, 60, motion.scale(48), motion.travel.easing);
  const numMembers = input.groups.reduce((sum, group) => {
    return sum + group.members.length;
  }, 0);
  const memberIndex =
    input.groups.slice(0, groupIndex).reduce((sum, group) => {
      return sum + group.members.length;
    }, 0) + index;
  return { travel, numMembers, memberIndex };
}

/** Samples the reunion member xstate for the current authored frame. */
function _getReunionMemberXState({
  index,
  groupIndex,
  input,
  frame,
  motion,
  travel,
  numMembers,
  memberIndex,
}: Readonly<GetReunionMemberXStateOptions>): GetReunionMemberXStateResult {
  const finalX = 480 + (memberIndex - (numMembers - 1) / 2) * 90;
  const x = Motion.mix({
    t: travel,
    from: (groupIndex === 0 ? 100 : 680) + index * 90,
    to: finalX,
  });
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
  const { accepting, handX, handY } = getReunionHandFromFrame({
    index,
    frame,
    groupIndex,
    input,
    x,
    y,
    side,
    greeting,
    motion,
  });
  return { x, y, greeting, stride, side, accepting, handX, handY };
}

/** Samples the global member ordering and its authored greeting pose. */
function _getReunionMemberPose(
  options: Readonly<
    Pick<Props, "input" | "frame" | "groupIndex" | "index"> & {
      motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
    }
  >,
): GetReunionMemberXStateResult {
  const { travel, numMembers, memberIndex } = _getMemberTravelOrder(options);
  return _getReunionMemberXState({
    ...options,
    travel,
    numMembers,
    memberIndex,
  });
}

/** Every member keeps an individual body, travel lane and greeting gesture. */
export function ReunionMember({
  member,
  index,
  groupIndex,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const pose = _getReunionMemberPose({
    input,
    frame,
    groupIndex,
    index,
    motion,
  });
  const drawing = {
    ...pose,
    accent,
    tokens,
    scales,
    index,
    groupIndex,
    frame,
    member,
    input,
  };
  return (
    <ReunionMemberContent
      member={member}
      x={pose.x}
      y={pose.y}
      drawing={drawing}
    />
  );
}
