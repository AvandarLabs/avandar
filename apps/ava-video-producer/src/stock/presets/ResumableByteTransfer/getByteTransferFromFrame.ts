import { EASE, ramp } from "../../../motion";
import type { Input } from "./ResumableByteTransfer.schema";
/** One exact half-open byte interval and its frame-derived transport state. */
export type TransferChunk = {
  start: number;
  end: number;
  progress: number;
  isConfirmed: boolean;
  isInterrupted: boolean;
};
/**
 * Confirmed chunks never travel again. Resumed chunks start at the checkpoint.
 */
export function getByteTransferFromFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  chunks: TransferChunk[];
  confirmed: number;
  remaining: number;
} {
  const { sizeBytes, chunkBytes } = input.file;
  const numPrefixChunks = input.acknowledgedBytes / chunkBytes;
  const numChunks = Math.ceil(sizeBytes / chunkBytes);
  const numResumedChunks =
    input.finalOutcome === "still-pending" ? 1 : numChunks - numPrefixChunks;
  const chunks: TransferChunk[] = Array.from(
    { length: numChunks },
    (_, index) => {
      const start = index * chunkBytes;
      const isPrefix = index < numPrefixChunks;
      const resumedIndex = index - numPrefixChunks;
      const duration = isPrefix ? 42 / numPrefixChunks : 48 / numResumedChunks;
      const startsAt = isPrefix
        ? 13 + index * duration
        : 91 + resumedIndex * duration;
      const isInterrupted =
        index === numPrefixChunks && frame >= 56 && frame <= 90;
      const isResumed = resumedIndex >= 0 && resumedIndex < numResumedChunks;
      const progress =
        isPrefix || isResumed ? ramp(frame, startsAt, duration, EASE.inOut) : 0;
      return {
        start,
        end: Math.min(start + chunkBytes, sizeBytes),
        progress,
        isConfirmed: progress === 1,
        isInterrupted,
      };
    },
  );
  const confirmed = chunks.reduce(
    (total, chunk) => total + (chunk.isConfirmed ? chunk.end - chunk.start : 0),
    0,
  );
  return { chunks, confirmed, remaining: sizeBytes - confirmed };
}
