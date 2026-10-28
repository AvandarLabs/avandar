import { EASE, mix, ramp } from "../../../motion";
import { EvolutionRow } from "./EvolutionRow";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  x: number;
  accent: string;
  expansion: number;
};
/** One supplied later row seats in the retained table. */
export function LaterEvolutionRow({
  input,
  frame,
  x,
  accent,
  expansion,
}: Readonly<Props>): ReactNode {
  return frame >= 93 ? (
    <g
      opacity={ramp(frame, 93, 20)}
      transform={`translate(0 ${mix(ramp(frame, 93, 39, EASE.inOut), 38, 0)})`}
    >
      <EvolutionRow
        record={input.laterRecord}
        x={x}
        y={220 + input.earlierRecords.length * 65}
        accent={accent}
        expansion={expansion}
        missingLabel={input.fields.missingLabel}
        missingOpacity={1}
        isLater
      />
    </g>
  ) : null;
}
