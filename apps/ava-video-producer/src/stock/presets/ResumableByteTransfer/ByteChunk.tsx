import { EASE, mix, ramp } from "../../../motion";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import { ByteIntervalRails } from "./ByteIntervalRails";
import type { TransferChunk } from "./getByteTransferFromFrame";
import type { Input } from "./ResumableByteTransfer.schema";
import type { ReactNode } from "react";
type Props = {
  chunk: TransferChunk;
  input: Input;
  frame: number;
  accent: string;
};
/** An intact exact-width chunk travels between retained byte interval rails. */
export function ByteChunk({
  chunk,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 84 + (chunk.start / input.file.sizeBytes) * 792;
  const width = ((chunk.end - chunk.start) / input.file.sizeBytes) * 792;
  const interruptedY =
    frame <= 73
      ? mix(ramp(frame, 56, 17, EASE.inOut), 180, 275)
      : mix(ramp(frame, 73, 17, EASE.inOut), 275, 180);
  const y = chunk.isInterrupted ? interruptedY : mix(chunk.progress, 180, 380);
  return (
    <g
      data-chunk-start={chunk.start}
      data-chunk-end={chunk.end}
      data-chunk-bytes={chunk.end - chunk.start}
    >
      <ByteIntervalRails x={x} width={width} />
      <rect
        data-received-chunk={chunk.isConfirmed ? chunk.start : undefined}
        data-moving-chunk={!chunk.isConfirmed ? chunk.start : undefined}
        x={x}
        y={y}
        width={width}
        height={54}
        rx={3}
        fill={chunk.isInterrupted ? STOCK.orange : accent}
        fillOpacity={0.15}
        stroke={chunk.isInterrupted ? STOCK.orange : accent}
      />
      {input.showOffsets ? (
        <g data-offset-label={chunk.start}>
          <LiteralDataText value={String(chunk.start)} x={x + 4} y={169} />
        </g>
      ) : undefined}
      {chunk.isInterrupted ? (
        <path
          data-interrupted-byte={chunk.start}
          d={`M${x + width / 2 - 6} ${y + 21} l12 12 m0 -12 l-12 12`}
          stroke={STOCK.orange}
          strokeWidth={2}
        />
      ) : undefined}
    </g>
  );
}
