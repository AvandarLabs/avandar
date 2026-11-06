import { ramp, mix, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { PushdownRow } from "./PushdownRow";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** All originals remain visible while matching copies move as complete rows. */
export function PushdownRows({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const matches = input.rows.filter((row) =>
    input.predicate.operator === ">="
      ? row.value >= input.predicate.threshold
      : row.value <= input.predicate.threshold,
  );
  const travel = ramp(frame, 96, 28, EASE.inOut),
    gates = ramp(frame, 51, 44, EASE.inOut);
  const settle = ramp(frame, 124, 15, EASE.inOut);
  return (
    <g opacity={ramp(frame, 13, 20)}>
      {matches.map((row, index) => (
        <PushdownRow
          key={row.id}
          row={row}
          x={mix(travel, 64, 580)}
          y={mix(settle, 246 + input.rows.indexOf(row) * 32, 246 + index * 32)}
          source={false}
          opacity={ramp(frame, 96, 4)}
          accent={accent}
        />
      ))}
      {input.rows.map((row, index) => (
        <g key={row.id}>
          <PushdownRow
            row={row}
            x={64}
            y={246 + index * 32}
            source
            accent={accent}
          />
          {!matches.includes(row) ? (
            <path
              data-gate={row.id}
              d={`M${438 - 18 * gates} ${228 + index * 32} v32`}
              stroke={STOCK.orange}
              strokeWidth={3}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
