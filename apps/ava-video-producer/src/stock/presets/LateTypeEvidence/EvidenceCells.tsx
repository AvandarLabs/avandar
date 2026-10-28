import { STOCK } from "../../stockPalette";
import { EvidenceOutputCell } from "./EvidenceOutputCell";
import { EvidenceSourceCell } from "./EvidenceSourceCell";
import type { Input } from "./LateTypeEvidence.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  background: string;
};
/** Two separate column slots retain all authored rows through type review. */
export function EvidenceCells({
  input,
  frame,
  accent,
  background,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.values.map((value, index) => (
        <g key={`${index}:${value}`}>
          <rect
            x={64}
            y={225 + index * 50}
            width={330}
            height={42}
            fill="none"
            stroke={STOCK.line}
          />
          <rect
            x={540}
            y={225 + index * 50}
            width={330}
            height={42}
            fill="none"
            stroke={STOCK.line}
          />
          <EvidenceSourceCell input={input} index={index} frame={frame} />
          <EvidenceOutputCell
            input={input}
            index={index}
            frame={frame}
            accent={accent}
            background={background}
          />
        </g>
      ))}
    </g>
  );
}
