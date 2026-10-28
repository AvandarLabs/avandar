import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LocalCountSheet } from "./LocalCountSheet";
import { PublicCountMap } from "./PublicCountMap";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Thresholded aggregate release with zero, missing and suppression distinct.
 */
export function MinimumCountMapSuppression({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 34, 880, 16, 2],
          [input.copy.before, 40, 78, 400, 14, 3],
          [input.copy.after, 550, 78, 370, 14, 3],
          [input.labels.local, 40, 130, 390, 12, 3],
          [input.labels.public, 550, 130, 370, 12, 3],
          [input.labels.suppressed, 40, 520, 280, 14, 3],
          [input.labels.zero, 350, 520, 260, 14, 3],
          [input.labels.missing, 660, 520, 260, 14, 3],
        ]}
      />
      <Text x={480} y={300} size={20} anchor="middle">
        ≥{input.minimum}
      </Text>
      <LocalCountSheet input={input} frame={frame} />
      <PublicCountMap input={input} frame={frame} accent={accent} />
    </g>
  );
}
