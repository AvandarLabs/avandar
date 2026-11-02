import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** The outcome caption describes both durable halves together. */
export function OutboxOutcome({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 111, 28)}>
      <LabelSlots
        labels={[
          [
            input.outcome === "commit"
              ? input.labels.committed
              : input.labels.aborted,
            70,
            550,
            820,
            20,
            2,
          ],
        ]}
      />
    </g>
  );
}
