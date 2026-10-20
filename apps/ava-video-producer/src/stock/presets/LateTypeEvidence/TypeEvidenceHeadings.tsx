import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * Column captions retain provisional source context and explicit policy state.
 */
export function TypeEvidenceHeadings({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const isWidened = input.policy === "widen-to-text";
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 30, 880, 16, 2],
          [input.labels.column, 40, 82, 880, 20, 2],
          [input.copy.source, 64, 140, 330, 12, 3],
          [input.copy.result, 540, 140, 330, 12, 3],
          [input.labels.provisional, 64, 195, 400, 12, 2],
          [input.labels.rows, 40, 558, 800, 14, 2],
        ]}
      />
      {frame >= 101 ? (
        <LabelSlots
          labels={[
            [
              isWidened ? input.labels.text : input.labels.review,
              540,
              195,
              400,
              12,
              2,
            ],
          ]}
        />
      ) : undefined}
      <Text x={900} y={558} size={20} anchor="end">
        {input.values.length}
      </Text>
    </g>
  );
}
