import { STOCK, type GraphicProps } from "../../graphics-common";
import { DoseToken } from "./DoseToken";
import { SessionCarrier } from "./SessionCarrier";
import { SessionHeadings } from "./SessionHeadings";
import { SessionRecipients } from "./SessionRecipients";
import { SessionTotals } from "./SessionTotals";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** The supplied stock partitions into exclusive physical destinations. */
export function VaccinationSessionBalance({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SessionHeadings input={input} />
      <SessionCarrier frame={frame} accent={accent} />
      <rect
        x={280}
        y={180}
        width={375}
        height={290}
        rx={24}
        fill="none"
        stroke={STOCK.line}
      />
      <path
        d="M690 205 V280 H930 V205 M690 385 V460 H930 V385"
        fill="none"
        stroke={STOCK.line}
      />
      <SessionRecipients input={input} frame={frame} accent={accent} />
      {input.units.map((unit, index) => (
        <DoseToken
          key={unit.id}
          input={input}
          unit={unit}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <SessionTotals input={input} frame={frame} />
    </g>
  );
}
