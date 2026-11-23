import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ByteChunk } from "./ByteChunk/ByteChunk";
import { ByteCounters } from "./ByteCounters";
import { getByteTransferFromFrame } from "./getByteTransferFromFrame";
import { RetryCheckpoint } from "./RetryCheckpoint";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const transfer = getByteTransferFromFrame({ motion, input, frame });
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
      <SketchedShape
        shape={{ kind: "path", d: "M900 207 V407 l-5 -8 m5 8 l5 -8" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        fill="none"
      />
      {transfer.chunks.map((chunk) => {
        return (
          <ByteChunk
            key={chunk.start}
            chunk={chunk}
            input={input}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <ByteCounters
        input={input}
        confirmed={transfer.confirmed}
        remaining={transfer.remaining}
      />
    </g>
  );
}
