import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { ConflictField } from "./ConflictField";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./FieldConflictChoice.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };
/**
 * Authored source choices travel into result lanes without silent resolution.
 */
export function FieldConflictChoice({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 20)}>
      <FitText
        text={input.recordTitle}
        x={44}
        y={52}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      {input.fields.map((field, index) => (
        <ConflictField
          key={field.id}
          frame={frame}
          accent={accent}
          input={input}
          field={field}
          index={index}
        />
      ))}
    </g>
  );
}
