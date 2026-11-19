import { mix } from "../../../motion";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ScopeTopicCopy } from "./ScopeTopicCopy";
import type { Input } from "./ScopeAperture.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  topic: Input["topics"][number];
  index: number;
  membershipIndex: number;
  showExcluded: boolean;
};
/** Topic membership controls the final position relative to the aperture. */
export function ScopeTopic({
  frame,
  accent,
  topic,
  index,
  membershipIndex,
  showExcluded,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
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
  const x = mix(contraction, initialX, finalX);
  const y = mix(contraction, initialY, finalY);
  const opacity =
    motion.reveal(frame, 12 + index * motion.stagger.list) *
    (topic.included || showExcluded
      ? 1
      : 1 - motion.ramp(frame, 96, motion.scale(24)));
  return (
    <g
      data-topic={topic.id}
      data-topic-position={topic.id}
      data-x={x}
      data-y={y}
      transform={`translate(${x} ${y})`}
      opacity={opacity}
      aria-hidden={!topic.included && !showExcluded && frame >= 120}
    >
      <ScopeTopicCopy {...{ topic, accent }} />
    </g>
  );
}
