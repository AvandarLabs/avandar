import { EASE, mix, ramp } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import { CitationTab } from "./CitationTab";
import { SummaryCopy } from "./SummaryCopy";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** Lift the statement while keeping its citation aligned to the sheet edge. */
export function ProvenanceSummary({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const peeling = ramp(frame, 40, 64, EASE.inOut);
  return (
    <g
      data-summary-strip="statement"
      transform={`translate(${mix(peeling, 100, 64)} ${mix(peeling, 160, 96)})`}
      opacity={ramp(frame, 12, 12)}
    >
      <StockRect
        x={0}
        y={0}
        width={400}
        height={250}
        rx={3}
        fill={STOCK.elevated}
        stroke={STOCK.line}
      />
      <SummaryCopy summary={input.summary} accent={accent} />
      <CitationTab label={input.citationLabel} frame={frame} accent={accent} />
    </g>
  );
}
