import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { DEMONSTRATE_CUE } from "../exchangeTiming";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type {
  ExpertiseRoleExchange,
  ExpertiseRoleExchangeTopicFramesValue,
} from "../ExpertiseRoleExchange";
import type { ReactNode } from "react";

type Props = {
  frame: Parameters<typeof ExpertiseRoleExchange>[0]["frame"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  topicFrames: ExpertiseRoleExchangeTopicFramesValue;
  topic: Parameters<typeof ExpertiseRoleExchange>[0]["input"]["topics"][number];
};

/** Renders the labels with authored geometry. */
export function ExpertiseRoleExchangeLabels({
  frame,
  motion,
  topicFrames: TOPIC_FRAMES,
  topic,
}: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: DEMONSTRATE_CUE,
        dur: motion.scale(TOPIC_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <LabelSlots labels={[[topic.label, 380, 245, 200, 14, 4]]} />
    </g>
  );
}
