import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./RepeatingBlocksToTable.schema";
import type { ReactNode } from "react";
/** Inputs for TableFieldHeadings. */
type Props = { input: Input; frame: number };

/**
 * Field ordering owns output columns without changing keyed cell membership.
 */
export function TableFieldHeadings({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 106, 12)}>
      <LabelSlots labels={[[input.copy.result, 300, 145, 608, 14, 2]]} />
      {input.fields.map((field, index) => (
        <g key={field.id}>
          <rect
            data-output-field={field.id}
            x={300 + index * 208}
            y={185}
            width={192}
            height={48}
            fill="none"
          />
          <LabelSlots
            labels={[[field.label, 310 + index * 208, 199, 172, 12, 3]]}
          />
        </g>
      ))}
    </g>
  );
}
