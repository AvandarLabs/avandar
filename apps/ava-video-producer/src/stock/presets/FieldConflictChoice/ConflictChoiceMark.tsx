import { STOCK } from "../../stockPalette";
import { getConflictChoicePositionFromField } from "./getConflictChoicePositionFromField";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";

type Props = {
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
  accent: string;
};
/**
 * Choice rails follow the authored source. Review brackets never select one.
 */
export function ConflictChoiceMark({
  field,
  input,
  y,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const position = getConflictChoicePositionFromField({
    field,
    input,
    y,
    progress,
  });
  if (!position) {
    return (
      <path
        data-review-field={field.id}
        d={`M468 ${y + 34}h12v58h12`}
        stroke={STOCK.orange}
        fill="none"
        opacity={progress}
      />
    );
  }
  const { x, top } = position;
  return input.decisionStyle === "sliding-rail" ? (
    <path
      data-choice-rail={field.id}
      d={`M${x} ${top - 5}H${x + 416}`}
      stroke={accent}
      strokeWidth={3}
      opacity={progress}
    />
  ) : (
    <path
      data-choice-bracket={field.id}
      d={`M${x + 2} ${top - 5}h-8v76h8`}
      stroke={accent}
      fill="none"
      opacity={progress}
    />
  );
}
