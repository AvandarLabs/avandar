import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CellLiteralValue } from "./CellLiteralValue";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = { row: Input["rows"][number]; input: Input; frame: number };
/** Retained originals use the rail heading or their own inline sublabel. */
export function CleanupRetainedValue({
  row,
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const inline = input.comparison === "inline-ghost";
  return (
    <g data-original-value={row.before} opacity={ramp(frame, 60, 52)}>
      {inline ? (
        <CleanupLaneHeading
          text={input.columnLabels.original}
          labelRole="original"
          placement="retained"
          x={88}
          y={42}
          fontSize={12}
        />
      ) : undefined}
      <g data-retained-literal={row.id}>
        <CellLiteralValue
          value={row.before}
          x={inline ? 88 : 514}
          y={inline ? 62 : 22}
          showWhitespace={input.showWhitespace}
          color={STOCK.muted}
        />
      </g>
    </g>
  );
}
