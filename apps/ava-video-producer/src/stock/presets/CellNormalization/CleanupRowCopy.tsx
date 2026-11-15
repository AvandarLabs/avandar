import { CleanupEditExplanation } from "./CleanupEditExplanation";
import { CleanupRetainedValue } from "./CleanupRetainedValue";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = { row: Input["rows"][number]; input: Input; frame: number };
/** Original values and edit explanations each retain their supplied labels. */
export function CleanupRowCopy({
  row,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CleanupRetainedValue row={row} input={input} frame={frame} />
      <CleanupEditExplanation row={row} input={input} frame={frame} />
    </g>
  );
}
