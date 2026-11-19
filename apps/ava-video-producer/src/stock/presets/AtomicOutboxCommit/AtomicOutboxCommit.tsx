import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { OutboxCommitMarks } from "./OutboxCommitMarks";
import { OutboxDurableState } from "./OutboxDurableState";
import { OutboxOutcome } from "./OutboxOutcome";
import { OutboxProposal } from "./OutboxProposal";
import { DIVIDER_DASH, UNMOUNT_CUE } from "./outboxShape";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      <StockRect
        x={70}
        y={140}
        width={820}
        height={360}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M480 155 V470" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeDasharray={DIVIDER_DASH}
      />
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
