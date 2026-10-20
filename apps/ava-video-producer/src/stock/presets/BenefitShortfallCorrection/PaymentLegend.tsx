import { PaymentQuantity } from "./PaymentQuantity";
import type { Input } from "./BenefitShortfallCorrection.schema";
import type { ReactNode } from "react";
/** Inputs for PaymentLegend. */
type Props = { input: Input; accent: string };

/** Pattern and total keys name the actual quantities without merging them. */
export function PaymentLegend({ input, accent }: Readonly<Props>): ReactNode {
  const totals = input.payments.reduce(
    (sum, payment) => [
      sum[0] + payment.statedUnits,
      sum[1] + payment.receivedUnits,
      sum[2] + payment.correctionUnits,
      sum[3] +
        payment.statedUnits -
        payment.receivedUnits -
        payment.correctionUnits,
    ],
    [0, 0, 0, 0],
  );
  return (
    <g>
      {(["stated", "received", "correction", "unresolved"] as const).map(
        (quantity, index) => (
          <PaymentQuantity
            key={quantity}
            label={input.labels[quantity]}
            index={index}
            total={totals[index]}
            showTotals={input.showTotals}
            accent={accent}
          />
        ),
      )}
    </g>
  );
}
