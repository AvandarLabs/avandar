import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { type GraphicProps } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ExpertiseParticipants } from "./ExpertiseParticipants";
import { ExpertiseWorktable } from "./ExpertiseWorktable";
import type { Input } from "./ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };

/**
 * Frame-controlled reciprocal demonstrations keep each person's identity fixed.
 */
export function ExpertiseRoleExchange({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const topicIndex = frame < 83 ? 0 : 1;
  const topic = input.topics[topicIndex];
  const firstExpert = input.people.findIndex(
    (person) => person.id === input.topics[0].expertId,
  );
  const secondExpert = 1 - firstExpert;
  const passage = ramp(frame, 83, 20, EASE.inOut);
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
      <g opacity={ramp(frame, 35, 10)}>
        <LabelSlots labels={[[topic.label, 380, 245, 200, 14, 4]]} />
      </g>
      <g opacity={ramp(frame, 131, 8)}>
        {input.topics.map((item, index) => (
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
                [input.labels.demonstrates, 650, 445 + index * 65, 250, 14, 3],
              ]}
            />
          </g>
        ))}
      </g>
      <g opacity={ramp(frame, 137, 10)}>
        <LabelSlots labels={[[input.closingLabel, 60, 580, 840, 14, 1]]} />
      </g>
    </g>
  );
}
