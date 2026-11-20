import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { OutboxCommitMarks } from "./OutboxCommitMarks/OutboxCommitMarks";
import { OutboxDurableState } from "./OutboxDurableState";
import { OutboxEnclosure } from "./OutboxEnclosure";
import { OutboxOutcome } from "./OutboxOutcome";
import { OutboxProposal } from "./OutboxProposal";
import { UNMOUNT_CUE } from "./outboxShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** A single sheet and latch create both durable effects or withdraw both. */
export function AtomicOutboxCommit({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 60, 55, 840, 18, 2],
          [input.change.recordLabel, 70, 105, 820, 16, 1],
          [input.labels.local, 100, 180, 320, 16, 3],
          [input.labels.outbox, 540, 180, 320, 16, 3],
        ]}
      />
      <OutboxEnclosure />
      <OutboxDurableState input={input} frame={frame} accent={accent} />
      {frame < UNMOUNT_CUE
        ? (["local", "journal"] as const).map((side) => {
            return (
              <OutboxProposal
                key={side}
                input={input}
                frame={frame}
                side={side}
                accent={accent}
              />
            );
          })
        : undefined}
      <OutboxCommitMarks input={input} frame={frame} accent={accent} />
      <OutboxOutcome input={input} frame={frame} />
    </g>
  );
}
