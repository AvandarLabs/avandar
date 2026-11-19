import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  return (
    <g>
      {input.values.map((value, index) => {
        return (
          <g key={`${index}:${value}`}>
            <StockRect
              x={64}
              y={225 + index * 50}
              width={330}
              height={42}
              fill="none"
              stroke={tokens.color.line}
            />
            <StockRect
              x={540}
              y={225 + index * 50}
              width={330}
              height={42}
              fill="none"
              stroke={tokens.color.line}
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
        );
      })}
    </g>
  );
}
