import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HANDOFF_CUE, SECOND_DEMONSTRATION_CUE } from "./exchangeTiming";
import { ExpertiseClosingSummary } from "./ExpertiseClosingSummary/ExpertiseClosingSummary";
import { ExpertiseParticipants } from "./ExpertiseParticipants";
import { ExpertiseRoleExchangeLabels } from "./ExpertiseRoleExchangeLabels/ExpertiseRoleExchangeLabels";
import { ExpertiseWorktable } from "./ExpertiseWorktable/ExpertiseWorktable";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & {
  input: Input;
};

/** The type of `TOPIC_FRAMES` used by ExpertiseRoleExchange. */
export type ExpertiseRoleExchangeTopicFramesValue = typeof TOPIC_FRAMES;

/** Frames the topic label takes to fade in. */
const TOPIC_FRAMES = 10;

/**
 * Frame-controlled reciprocal demonstrations keep each person's identity fixed.
 */
export function ExpertiseRoleExchange({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const topicIndex = frame < HANDOFF_CUE ? 0 : 1;
  const topic = input.topics[topicIndex];
  const firstExpert = input.people.findIndex(
    propEq("id", input.topics[0].expertId),
  );
  const secondExpert = 1 - firstExpert;
  // The tool crosses for the whole handoff, cue to cue.
  const passage = Motion.ramp({
    frame,
    at: HANDOFF_CUE,
    dur: SECOND_DEMONSTRATION_CUE - HANDOFF_CUE,
    easing: motion.travel.easing,
  });
  const toolX = Motion.mix({
    t: passage,
    from: firstExpert === 0 ? 380 : 580,
    to: secondExpert === 0 ? 380 : 580,
  });
  return (
    <g>
      <LabelSlots labels={[[input.labels.example, 60, 34, 840, 14, 2]]} />
      <ExpertiseParticipants {...{ input, frame, accent, toolX }} />
      <ExpertiseWorktable {...{ input, frame, accent, toolX }} />
      <ExpertiseRoleExchangeLabels
        frame={frame}
        motion={motion}
        topicFrames={TOPIC_FRAMES}
        topic={topic}
      />
      <ExpertiseClosingSummary {...{ frame, input, motion }} />
    </g>
  );
}
