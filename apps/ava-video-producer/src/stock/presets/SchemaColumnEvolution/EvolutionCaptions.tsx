import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Optional version captions leave the evidence boundary visible. */
export function EvolutionCaptions({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.showVersionLabels ? (
        <LabelSlots
          labels={[
            [input.phaseLabels.before, 80, 65, 375, 16, 3],
            [input.phaseLabels.expanded, 500, 65, 380, 16, 3],
          ]}
        />
      ) : null}
      {input.showVersionLabels && frame >= 132 ? (
        <g opacity={ramp(frame, 132, 12)}>
          <LabelSlots
            labels={[[input.phaseLabels.later, 80, 520, 800, 16, 1]]}
          />
        </g>
      ) : null}
      <LabelSlots labels={[[input.evidenceLabel, 80, 550, 800, 12, 3]]} />
    </g>
  );
}
