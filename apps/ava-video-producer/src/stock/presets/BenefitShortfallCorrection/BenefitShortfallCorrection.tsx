import { STOCK, type GraphicProps } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { PaymentLegend } from "./PaymentLegend";
import { PaymentRow } from "./PaymentRow";
import type { Input } from "./BenefitShortfallCorrection.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Original, correction and unresolved units remain separately inspectable. */
export function BenefitShortfallCorrection({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.exampleLabel, 48, 38, 864, 18, 1],
          [input.people.participant, 48, 84, 330, 14, 3],
          [input.people.worker, 580, 84, 330, 14, 3],
          [input.unitLabel, 48, 563, 864, 16, 1],
        ]}
      />
      <PersonGlyph x={250} y={160} color={accent} />
      <PersonGlyph x={740} y={160} color={STOCK.cyan} role="worker" />
      {input.payments.map((payment, index) => (
        <PaymentRow
          key={payment.id}
          payment={payment}
          frame={frame}
          index={index}
          accent={accent}
        />
      ))}
      <PaymentLegend input={input} accent={accent} />
    </g>
  );
}
