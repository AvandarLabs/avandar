import { STOCK } from "../../stockPalette";
import { ConflictCandidateCopy } from "./ConflictCandidateCopy";
import { getConflictCandidateStateFromField } from "./getConflictCandidateStateFromField";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";
type Props = {
  source: Input["sources"][number];
  sourceIndex: number;
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
  accent: string;
};
/** A source value remains literal as its panel lifts into its chosen lane. */
export function ConflictCandidate({
  source,
  sourceIndex,
  field,
  input,
  y,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const { value, isChosen, isResolved, isHidden, x, top, opacity } =
    getConflictCandidateStateFromField({
      source,
      sourceIndex,
      field,
      input,
      y,
      progress,
    });
  if (isHidden) {
    return undefined;
  }
  return (
    <g opacity={opacity}>
      <rect
        data-candidate-source={source.id}
        data-field={field.id}
        data-result-field={isChosen && progress === 1 ? field.id : undefined}
        data-result-value={isChosen && progress === 1 ? value : undefined}
        x={x}
        y={top}
        width={416}
        height={66}
        rx={5}
        fill={STOCK.surface}
        stroke={isChosen ? accent : STOCK.line}
      />
      <ConflictCandidateCopy
        sourceLabel={source.label}
        value={value}
        labels={input.labels}
        x={x}
        top={top}
        isChosen={isChosen}
        isResolved={isResolved}
        progress={progress}
      />
    </g>
  );
}
