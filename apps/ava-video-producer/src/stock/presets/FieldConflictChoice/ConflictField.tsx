import { EASE, ramp } from "../../../motion";
import { ConflictCandidate } from "./ConflictCandidate";
import { ConflictChoiceMark } from "./ConflictChoiceMark";
import { ConflictFieldHeading } from "./ConflictFieldHeading";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  input: Input;
  field: Input["fields"][number];
  index: number;
};
/**
 * A field keeps the chosen result and its unresolved or rejected alternatives.
 */
export function ConflictField({
  frame,
  accent,
  input,
  field,
  index,
}: Readonly<Props>): ReactNode {
  const y = 106 + index * 122;
  const progress = ramp(frame, 42, 70, EASE.inOut);
  return (
    <g>
      <ConflictFieldHeading
        field={field}
        input={input}
        y={y}
        progress={progress}
      />
      <ConflictChoiceMark
        field={field}
        input={input}
        y={y}
        progress={progress}
        accent={accent}
      />
      {input.sources.map((source, sourceIndex) => (
        <ConflictCandidate
          key={source.id}
          source={source}
          sourceIndex={sourceIndex}
          field={field}
          input={input}
          y={y}
          progress={progress}
          accent={accent}
        />
      ))}
    </g>
  );
}
