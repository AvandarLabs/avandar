import { STOCK } from "../../stockPalette";
import { getPaymentUnitGeometryFromPayment } from "./getPaymentUnitGeometryFromPayment";
import { ReceivedToken } from "./ReceivedToken";
import type { Input } from "./BenefitShortfallCorrection.schema";
import type { ReactNode } from "react";

type Props = {
  payment: Input["payments"][number];
  frame: number;
  index: number;
  unitIndex: number;
  accent: string;
};
/**
 * Exactly one original, correction or empty position accounts for each unit.
 */
export function PaymentUnit({
  payment,
  frame,
  index,
  unitIndex,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, isOriginal, isCorrection, tokenY, isHandling } =
    getPaymentUnitGeometryFromPayment({ payment, frame, index, unitIndex });
  return (
    <g>
      <circle
        data-stated-slot={unitIndex}
        cx={x}
        cy={y + 24}
        r={23}
        fill="none"
        stroke={STOCK.orange}
        strokeDasharray="4 4"
      />
      {isOriginal || isCorrection ? (
        <ReceivedToken
          paymentId={payment.id}
          unitIndex={unitIndex}
          x={x}
          y={tokenY}
          isOriginal={isOriginal}
          isHandling={isHandling}
          accent={accent}
        />
      ) : (
        <circle
          data-unit-kind="gap"
          cx={x}
          cy={y + 24}
          r={18}
          fill="none"
          stroke={STOCK.orange}
          strokeDasharray="2 4"
        />
      )}
    </g>
  );
}
