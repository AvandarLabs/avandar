import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPaymentUnitGeometryFromPayment } from "../getPaymentUnitGeometryFromPayment";
import { ReceivedToken } from "../ReceivedToken/ReceivedToken";
import { GapSlot } from "./GapSlot";
import type { Input } from "../BenefitShortfallCorrection.schema";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const unit = getPaymentUnitGeometryFromPayment({
    motion,
    payment,
    frame,
    index,
    unitIndex,
  });
  return (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: unit.x, cy: unit.y + 24, r: 23 }}
        profile={tokens.sketch.shape}
        data-stated-slot={unitIndex}
        fill="none"
        stroke={tokens.color.highlight}
        strokeDasharray={tokens.dash.pending.join(" ")}
      />
      {unit.isOriginal || unit.isCorrection ? (
        <ReceivedToken
          paymentId={payment.id}
          unitIndex={unitIndex}
          x={unit.x}
          y={unit.tokenY}
          isOriginal={unit.isOriginal}
          isHandling={unit.isHandling}
          accent={accent}
        />
      ) : (
        <GapSlot x={unit.x} y={unit.y} />
      )}
    </g>
  );
}
