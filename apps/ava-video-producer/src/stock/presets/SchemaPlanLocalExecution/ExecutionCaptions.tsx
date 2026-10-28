import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Authored boundary and phase copy preserves the actual planning distinction.
 */
export function ExecutionCaptions({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [input.boundaryLabels.local, 40, 30, 520, 18, 3],
        [input.boundaryLabels.remote, 630, 30, 286, 18, 4],
        [input.copy.context, 40, 566, 880, 14, 1],
        [
          frame >= 140 ? input.copy.after : input.copy.before,
          40,
          588,
          880,
          14,
          1,
        ],
        ...(frame >= 55
          ? [
              [input.boundaryLabels.outbound, 640, 284, 268, 14, 3] as [
                string,
                number,
                number,
                number,
                14,
                number,
              ],
            ]
          : []),
        ...(frame >= 56
          ? [
              [input.boundaryLabels.inbound, 640, 222, 268, 14, 3] as [
                string,
                number,
                number,
                number,
                14,
                number,
              ],
            ]
          : []),
      ]}
    />
  );
}
