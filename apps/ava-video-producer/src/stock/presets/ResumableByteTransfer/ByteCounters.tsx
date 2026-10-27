import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ResumableByteTransfer.schema";
import type { ReactNode } from "react";
type Props = { input: Input; confirmed: number; remaining: number };
/**
 * The two counters always partition the exact file size, with offsets hidden.
 */
export function ByteCounters({
  input,
  confirmed,
  remaining,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-byte-counters="true"
      data-confirmed-bytes={confirmed}
      data-remaining-bytes={remaining}
    >
      <LabelSlots
        labels={[
          [input.labels.confirmed, 84, 482, 360, 14, 2],
          [input.labels.remaining, 530, 482, 360, 14, 2],
          [`${confirmed} / ${input.file.sizeBytes}`, 84, 539, 360, 20, 1],
          [String(remaining), 530, 539, 360, 20, 1],
          [input.labels.unit, 84, 574, 360, 14, 2],
          [input.labels.unit, 530, 574, 360, 14, 2],
        ]}
      />
    </g>
  );
}
