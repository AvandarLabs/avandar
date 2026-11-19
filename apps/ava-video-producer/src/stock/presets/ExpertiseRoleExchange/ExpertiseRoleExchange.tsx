import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  DEMONSTRATE_CUE,
  HANDOFF_CUE,
  SECOND_DEMONSTRATION_CUE,
} from "./exchangeTiming";
import { ExpertiseParticipants } from "./ExpertiseParticipants";
import { ExpertiseWorktable } from "./ExpertiseWorktable";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/** Frames the topic label takes to fade in. */
const TOPIC_FRAMES = 10;
/** Frames the attribution summary takes to fade in. */
const SUMMARY_FRAMES = 8;
/** Frames the closing line takes to fade in. */
const CLOSING_FRAMES = 10;

/**
 * Frame-controlled reciprocal demonstrations keep each person's identity fixed.
 */
export function ExpertiseRoleExchange({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const topicIndex = frame < HANDOFF_CUE ? 0 : 1;
  const topic = input.topics[topicIndex];
  const firstExpert = input.people.findIndex((person) => {
    return person.id === input.topics[0].expertId;
  });
  const secondExpert = 1 - firstExpert;
  // The tool crosses for the whole handoff, cue to cue.
  const passage = ramp(
    frame,
    HANDOFF_CUE,
    SECOND_DEMONSTRATION_CUE - HANDOFF_CUE,
    motion.travel.easing,
  );
  const toolX = mix(
    passage,
    firstExpert === 0 ? 380 : 580,
    secondExpert === 0 ? 380 : 580,
  );
  return (
    <g>
      <LabelSlots labels={[[input.labels.example, 60, 34, 840, 14, 2]]} />
      <ExpertiseParticipants
        input={input}
        frame={frame}
        accent={accent}
        toolX={toolX}
      />
      <ExpertiseWorktable
        input={input}
        frame={frame}
        accent={accent}
        toolX={toolX}
      />
      <g
        opacity={ramp(
          frame,
          DEMONSTRATE_CUE,
          motion.scale(TOPIC_FRAMES),
          motion.reveal.easing,
        )}
      >
        <LabelSlots labels={[[topic.label, 380, 245, 200, 14, 4]]} />
      </g>
      <g
        opacity={ramp(
          frame,
          131,
          motion.scale(SUMMARY_FRAMES),
          motion.reveal.easing,
        )}
      >
        {input.topics.map((item, index) => {
          return (
            <g key={item.id} data-topic-attribution={item.id}>
              <LabelSlots
                labels={[
                  [item.label, 60, 445 + index * 65, 270, 14, 3],
                  [
                    input.people.find(propEq("id", item.expertId))!.label,
                    390,
                    445 + index * 65,
                    210,
                    14,
                    3,
                  ],
                  [
                    input.labels.demonstrates,
                    650,
                    445 + index * 65,
                    250,
                    14,
                    3,
                  ],
                ]}
              />
            </g>
          );
        })}
      </g>
      <g
        opacity={ramp(
          frame,
          137,
          motion.scale(CLOSING_FRAMES),
          motion.reveal.easing,
        )}
      >
        <LabelSlots labels={[[input.closingLabel, 60, 580, 840, 14, 1]]} />
      </g>
    </g>
  );
}
