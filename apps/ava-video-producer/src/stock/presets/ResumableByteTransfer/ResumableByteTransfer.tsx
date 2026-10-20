import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { ByteChunk } from "./ByteChunk";
import { ByteCounters } from "./ByteCounters";
import { getByteTransferFromFrame } from "./getByteTransferFromFrame";
import { RetryCheckpoint } from "./RetryCheckpoint";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ResumableByteTransfer.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/**
 * Confirm a prefix, interrupt one segment, then resume at its durable offset.
 */
export function ResumableByteTransfer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const transfer = getByteTransferFromFrame({ input, frame });
  const checkpoint =
    84 + (input.acknowledgedBytes / input.file.sizeBytes) * 792;
  return (
    <g data-resume-offset={input.acknowledgedBytes}>
      <LabelSlots labels={[[input.file.label, 84, 55, 792, 20, 2]]} />
      <RetryCheckpoint
        label={input.labels.retry}
        checkpoint={checkpoint}
        frame={frame}
      />
      <path
        d="M900 207 V407 l-5 -8 m5 8 l5 -8"
        stroke={STOCK.muted}
        fill="none"
      />
      {transfer.chunks.map((chunk) => (
        <ByteChunk
          key={chunk.start}
          chunk={chunk}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
      <ByteCounters
        input={input}
        confirmed={transfer.confirmed}
        remaining={transfer.remaining}
      />
    </g>
  );
}
