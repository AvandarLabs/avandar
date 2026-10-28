import { ramp } from "../../../motion";
import { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import { PlottedRowAssociation } from "./PlottedRowAssociation";
import { TriageRowToken } from "./TriageRowToken";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * Fixed plotted coordinates retain all source-key associations after arrival.
 */
export function TriageTokens({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { rows } = makeCoordinateTriageFromInputAndFrame({ input, frame });
  return (
    <g>
      {rows.map((row) => (
        <g key={row.id}>
          {row.reason === "plotted" ? (
            <g>
              <PlottedRowAssociation row={row} frame={frame} accent={accent} />
              <circle
                data-plotted-point={row.id}
                cx={row.targetX}
                cy={row.targetY}
                r={5}
                fill="none"
                stroke={accent}
                opacity={ramp(frame, 51 + row.index * 3, 39)}
              />
            </g>
          ) : undefined}
          <TriageRowToken row={row} frame={frame} accent={accent} />
        </g>
      ))}
    </g>
  );
}
