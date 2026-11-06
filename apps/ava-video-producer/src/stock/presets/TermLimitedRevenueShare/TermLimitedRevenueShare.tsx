import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { RevenueLegend } from "./RevenueLegend";
import { RevenuePeriod } from "./RevenuePeriod";
import { RevenueTerm } from "./RevenueTerm";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";
/** Frame-driven independent cash-flow comparison. */
export type Props = GraphicProps & { input: Input };
/** Closes one temporary outlet without changing receipts or operating flow. */
export function TermLimitedRevenueShare({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.arrangement.label, 60, 45, 840, 18, 2],
          [input.money.unitLabel, 60, 90, 840, 14, 1],
          [input.copy.receipts, 60, 125, 840, 14, 2],
          [input.copy.example, 60, 580, 840, 12, 2],
        ]}
      />
      {input.periods.map((period, index) => (
        <RevenuePeriod
          key={period.id}
          period={period}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
      <RevenueTerm frame={frame} input={input} accent={accent} />
      <RevenueLegend input={input} accent={accent} />
    </g>
  );
}
