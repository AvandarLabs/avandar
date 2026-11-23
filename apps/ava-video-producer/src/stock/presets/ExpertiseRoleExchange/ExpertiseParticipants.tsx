import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  DEMONSTRATE_CUE,
  HANDOFF_CUE,
  RELEASE_CUE,
  SECOND_DEMONSTRATION_CUE,
} from "./exchangeTiming";
import { ExpertiseParticipantBody } from "./ExpertiseParticipantBody/ExpertiseParticipantBody";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";
/** Inputs for getExpertiseTopicAndReach. */
type GetExpertiseTopicAndReachArguments = {
  input: Input;
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Samples the active topic and initial reach on the authored cue. */
function _getExpertiseTopicAndReach({
  input,
  frame,
  motion,
}: Readonly<GetExpertiseTopicAndReachArguments>): {
  topic: Input["topics"][number];
  reach: number;
} {
  const topic = input.topics[frame < HANDOFF_CUE ? 0 : 1];
  const reach = Motion.ramp({
    frame,
    at: DEMONSTRATE_CUE,
    dur: motion.scale(REACH_FRAMES),
    easing: motion.entrance.easing,
  });
  return { topic, reach };
}

/** Inputs for getExpertiseSeatGeometry. */
type GetExpertiseSeatGeometryArguments = { input: Input; index: number };

/** Locates a participant and its label for the authored table arrangement. */
function _getExpertiseSeatGeometry({
  input,
  index,
}: Readonly<GetExpertiseSeatGeometryArguments>): { x: number; labelX: number } {
  const x =
    index === 0
      ? input.tableArrangement === "side-by-side"
        ? 350
        : 210
      : input.tableArrangement === "side-by-side"
        ? 610
        : 750;
  const labelX =
    input.tableArrangement === "side-by-side"
      ? index === 0
        ? 240
        : 500
      : index === 0
        ? 60
        : 680;
  return { x, labelX };
}

type Props = {
  input: Input;
  frame: number;
  accent: string;
  toolX: number;
};
/** Frames the first expert takes to reach for the tool. */
const REACH_FRAMES = 15;

/** Preserves the outgoing release and incoming tool-contact cue spans. */
function _getExpertiseHandContact({
  transfer,
  isOutgoing,
  frame,
  motion,
  isExpert,
  reach,
}: Readonly<GetExpertiseHandContactOptions>): number {
  return transfer
    ? isOutgoing
      ? 1 -
        Motion.ramp({
          frame,
          at: RELEASE_CUE,
          dur: SECOND_DEMONSTRATION_CUE - RELEASE_CUE,
          easing: motion.exit.easing,
        })
      : Motion.ramp({
          frame,
          at: HANDOFF_CUE,
          dur: RELEASE_CUE - HANDOFF_CUE,
          easing: motion.entrance.easing,
        })
    : isExpert
      ? reach
      : 0;
}

/** Equal-scale participants retain names and organizational roles. */
export function ExpertiseParticipants({
  input,
  frame,
  accent,
  toolX,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { topic, reach } = _getExpertiseTopicAndReach({ input, frame, motion });
  return (
    <g>
      {input.people.map((person, index) => {
        const { x, labelX } = _getExpertiseSeatGeometry({ input, index });
        const isExpert = person.id === topic.expertId;
        const restingX = x + (index === 0 ? 22 : -22);
        const isOutgoing = person.id === input.topics[0].expertId;
        // The handoff keeps its cue spans: one hand lets go as the other takes
        // hold, and both finish as the second demonstration starts.
        const transfer =
          frame >= HANDOFF_CUE && frame <= SECOND_DEMONSTRATION_CUE;
        const contact = _getExpertiseHandContact({
          transfer,
          isOutgoing,
          frame,
          motion,
          isExpert,
          reach,
        });
        const handX = Motion.mix({ t: contact, from: restingX, to: toolX });
        const handY = Motion.mix({ t: contact, from: 315, to: 325 });
        return (
          <ExpertiseParticipantBody
            key={person.id}
            {...{ person, motion, frame, index, labelX, input, x, accent }}
            {...{ handX, handY, tokens, isExpert, scales, transfer }}
          />
        );
      })}
    </g>
  );
}

type GetExpertiseHandContactOptions = {
  transfer: boolean;
  isOutgoing: boolean;
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  isExpert: boolean;
  reach: number;
};
