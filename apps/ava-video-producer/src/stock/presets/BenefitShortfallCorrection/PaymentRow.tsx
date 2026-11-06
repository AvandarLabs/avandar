import { PaymentTray } from "./PaymentTray";
import { PaymentUnit } from "./PaymentUnit";
import type { Input } from "./BenefitShortfallCorrection.schema";
import type { ReactNode } from "react";

type Props = {
  payment: Input["payments"][number];
  frame: number;
  index: number;
  accent: string;
};
/** Every payment retains its own outlines, quantities and label. */
export function PaymentRow({
  payment,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-payment={payment.id}>
      <PaymentTray
        payment={payment}
        frame={frame}
        index={index}
        accent={accent}
      />
      {Array.from({ length: payment.statedUnits }, (_, unitIndex) => (
        <PaymentUnit
          key={unitIndex}
          payment={payment}
          frame={frame}
          index={index}
          unitIndex={unitIndex}
          accent={accent}
        />
      ))}
    </g>
  );
}
