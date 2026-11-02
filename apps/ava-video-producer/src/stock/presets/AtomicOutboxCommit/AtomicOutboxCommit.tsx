import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { OutboxCommitMarks } from "./OutboxCommitMarks";
import { OutboxDurableState } from "./OutboxDurableState";
import { OutboxOutcome } from "./OutboxOutcome";
import { OutboxProposal } from "./OutboxProposal";
import type { GraphicProps } from "../../graphics-common";
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
      <rect
        x={70}
        y={140}
        width={820}
        height={360}
        rx={8}
        fill="none"
        stroke={STOCK.line}
      />
      <path d="M480 155 V470" stroke={STOCK.line} strokeDasharray="5 7" />
      <OutboxDurableState input={input} frame={frame} accent={accent} />
      {frame < 139
        ? (["local", "journal"] as const).map((side) => (
            <OutboxProposal
              key={side}
              input={input}
              frame={frame}
              side={side}
              accent={accent}
            />
          ))
        : undefined}
      <OutboxCommitMarks input={input} frame={frame} accent={accent} />
      <OutboxOutcome input={input} frame={frame} />
    </g>
  );
}
