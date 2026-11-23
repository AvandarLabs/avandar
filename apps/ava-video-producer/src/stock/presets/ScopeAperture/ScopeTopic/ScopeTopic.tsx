import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ScopeTopicTopic } from "./ScopeTopicTopic";
import type { Input } from "../ScopeAperture.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  topic: Input["topics"][number];
  index: number;
  membershipIndex: number;
  showExcluded: boolean;
};

type GetScopeTopicXStateOptions = {
  frame: Readonly<Props>["frame"];
  topic: Readonly<Props>["topic"];
  index: Readonly<Props>["index"];
  membershipIndex: Readonly<Props>["membershipIndex"];
  showExcluded: Readonly<Props>["showExcluded"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type GetScopeTopicXStateResult = { x: number; y: number; opacity: number };

/** Samples the scope topic xstate for the current authored frame. */
function _getScopeTopicXState({
  frame,
  topic,
  index,
  membershipIndex,
  showExcluded,
  motion,
}: Readonly<GetScopeTopicXStateOptions>): GetScopeTopicXStateResult {
  const contraction = motion.ramp(
    frame,
    36,
    motion.scale(72),
    motion.travel.easing,
  );
  const initialX = index % 2 === 0 ? 260 : 700;
  const initialY = 215 + Math.floor(index / 2) * 120;
  const finalX = topic.included ? 480 : membershipIndex % 2 === 0 ? 130 : 830;
  const finalY = topic.included
    ? 326 + membershipIndex * 70
    : 200 + Math.floor(membershipIndex / 2) * 110;
  const x = Motion.mix({
    t: contraction,
    from: initialX,
    to: finalX,
  });
  const y = Motion.mix({
    t: contraction,
    from: initialY,
    to: finalY,
  });
  const opacity =
    motion.reveal(frame, 12 + index * motion.stagger.list) *
    (topic.included || showExcluded
      ? 1
      : 1 - motion.ramp(frame, 96, motion.scale(24)));
  return { x, y, opacity };
}

/** Topic membership controls the final position relative to the aperture. */
export function ScopeTopic({
  frame,
  accent,
  topic,
  index,
  membershipIndex,
  showExcluded,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y, opacity } = _getScopeTopicXState({
    frame,
    topic,
    index,
    membershipIndex,
    showExcluded,
    motion,
  });
  return (
    <ScopeTopicTopic
      frame={frame}
      accent={accent}
      topic={topic}
      showExcluded={showExcluded}
      x={x}
      y={y}
      opacity={opacity}
    />
  );
}
