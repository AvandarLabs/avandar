import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { PaymentLegend } from "./PaymentLegend";
import { PaymentRow } from "./PaymentRow";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./BenefitShortfallCorrection.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Original, correction and unresolved units remain separately inspectable. */
export function BenefitShortfallCorrection({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
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
      <PersonGlyph
        x={740}
        y={160}
        color={tokens.color.accentAlt}
        role="worker"
      />
      {input.payments.map((payment, index) => {
        return (
          <PaymentRow
            key={payment.id}
            payment={payment}
            frame={frame}
            index={index}
            accent={accent}
          />
        );
      })}
      <PaymentLegend input={input} accent={accent} />
    </g>
  );
}
