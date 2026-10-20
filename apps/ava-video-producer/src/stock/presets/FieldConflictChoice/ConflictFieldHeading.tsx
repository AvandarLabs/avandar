import { FitText } from "../../primitives/FitText/FitText";
import { getConflictChoicePositionFromField } from "./getConflictChoicePositionFromField";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";
type Props = {
  field: Input["fields"][number];
  input: Input;
  y: number;
  progress: number;
};
/**
 * Field names and explicit review status identify each independent decision.
 */
export function ConflictFieldHeading({
  field,
  input,
  y,
  progress,
}: Readonly<Props>): ReactNode {
  const position = getConflictChoicePositionFromField({
    field,
    input,
    y,
    progress,
  });
  return (
    <g>
      <FitText
        text={field.label}
        x={44}
        y={y + 10}
        width={420}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      {progress > 0 ? (
        <g opacity={progress}>
          <FitText
            text={position ? input.labels.selected : input.labels.unresolved}
            x={position ? position.x + 12 : 272}
            y={position ? position.top + 81 : y + 111}
            width={392}
            fontSize={12}
            maxLines={1}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ) : undefined}
    </g>
  );
}
