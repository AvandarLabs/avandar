import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LeakPipe } from "./LeakPipe";
import { LeakRepairWorker } from "./LeakRepairWorker";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./RecurringLeakPrevention.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };

/**
 * Containment, source repair and observed retest remain separate physical
 * beats.
 */
export function RecurringLeakPrevention({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const observation =
    input.retest === "stopped"
      ? input.labels.stopped
      : input.retest === "still-leaking"
        ? input.labels.continued
        : input.labels.untested;
  const phase =
    frame < 63
      ? input.labels.containment
      : frame < 107 || input.retest === "not-tested"
        ? input.labels.repair
        : input.labels.test;
  return (
    <g>
      <LabelSlots labels={[[input.labels.example, 60, 570, 840, 14, 2]]} />
      <g opacity={ramp(frame, 12, 12)}>
        <LabelSlots
          labels={[
            [input.fixtureLabel, 340, 145, 320, 18, 3],
            [input.workerLabel, 60, 475, 250, 16, 4],
          ]}
        />
      </g>
      <LeakPipe input={input} frame={frame} accent={accent} />
      <LeakRepairWorker input={input} frame={frame} accent={accent} />
      {input.showPhaseCaptions ? (
        <g data-phase-caption="true" opacity={ramp(frame, 39, 10)}>
          <LabelSlots labels={[[phase, 330, 485, 270, 14, 3]]} />
        </g>
      ) : undefined}
      <g opacity={ramp(frame, 63, 12)}>
        <LabelSlots labels={[[input.repair.label, 60, 100, 260, 16, 4]]} />
      </g>
      <g opacity={ramp(frame, 107, 12)}>
        <LabelSlots labels={[[observation, 630, 485, 270, 16, 3]]} />
      </g>
    </g>
  );
}
