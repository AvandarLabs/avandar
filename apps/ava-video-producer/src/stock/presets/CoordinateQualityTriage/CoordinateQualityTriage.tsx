import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { CoordinateRows } from "./CoordinateRows";
import { TriagePlane } from "./TriagePlane";
import { TriageTokens } from "./TriageTokens";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Numeric and range triage retains the complete input denominator. */
export function CoordinateQualityTriage({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 34, 880, 16, 2],
          [input.copy.before, 480, 78, 440, 14, 3],
          [input.copy.after, 40, 78, 390, 14, 3],
        ]}
      />
      <TriagePlane input={input} frame={frame} />
      <CoordinateRows input={input} frame={frame} />
      <TriageTokens input={input} frame={frame} accent={accent} />
    </g>
  );
}
