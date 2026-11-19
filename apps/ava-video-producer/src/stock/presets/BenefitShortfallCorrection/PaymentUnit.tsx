import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const { atomic } = useGraphicTheme();
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const { x, y, isOriginal, isCorrection, tokenY, isHandling } =
    getPaymentUnitGeometryFromPayment({
      motion,
      payment,
      frame,
      index,
      unitIndex,
    });
  return (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y + 24, r: 23 }}
        profile={tokens.sketch.shape}
        data-stated-slot={unitIndex}
        fill="none"
        stroke={tokens.color.highlight}
        strokeDasharray={tokens.dash.pending.join(" ")}
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
        <SketchedShape
          shape={{ kind: "circle", cx: x, cy: y + 24, r: 18 }}
          profile={tokens.sketch.shape}
          data-unit-kind="gap"
          fill="none"
          stroke={tokens.color.highlight}
          strokeDasharray={atomic.dash.dotted.join(" ")}
        />
      )}
    </g>
  );
}
