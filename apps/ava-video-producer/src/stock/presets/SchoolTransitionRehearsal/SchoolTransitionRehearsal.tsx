import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getRehearsalFromFrame } from "./getRehearsalFromFrame";
import { PracticeInterior } from "./PracticeInterior";
import { PracticePeople } from "./PracticePeople";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * A learner rehearses two physical stops with their authored companion choice.
 */
export function SchoolTransitionRehearsal({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const scene = getRehearsalFromFrame({ frame, input });
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.example, 48, 40, 864, 16, 2],
          [input.labels.setting, 48, 80, 410, 16, 3],
          [input.labels.practice, 505, 80, 410, 16, 3],
          [input.labels.choice, 48, 145, 864, 16, 2],
          [input.people.learner, 48, 549, 390, 14, 3],
          [input.people.companion, 515, 549, 390, 14, 3],
        ]}
      />
      <PracticeInterior
        input={input}
        doorWidth={scene.doorWidth}
        accent={accent}
        finalStep={scene.finalStep}
      />
      <PracticePeople input={input} scene={scene} accent={accent} />
      <path
        d={`M${scene.learnerX} 515 V523 H48 V530 M${scene.companionX} 417 V526 H515 V530`}
        fill="none"
        stroke={accent}
        opacity={0.25}
      />
    </g>
  );
}
