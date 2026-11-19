import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./BenefitShortfallCorrection.schema";

type Options = {
  payment: Input["payments"][number];
  frame: number;
  index: number;
  unitIndex: number;
  motion: VideoMotion;
};
/** Data for getPaymentUnitGeometryFromPayment. */
type GetPaymentUnitGeometryResult = {
  x: number;
  y: number;
  isOriginal: boolean;
  isCorrection: boolean;
  tokenY: number;
  isHandling: boolean;
};

/** Placement and handling preserve the payment's exact additive quantities. */
export function getPaymentUnitGeometryFromPayment({
  payment,
  frame,
  index,
  unitIndex,
  motion,
}: Readonly<Options>): GetPaymentUnitGeometryResult {
  const x = 330 + unitIndex * 68;
  const y = 306 + index * 120;
  const isOriginal = unitIndex < payment.receivedUnits;
  const isCorrection =
    unitIndex >= payment.receivedUnits &&
    unitIndex < payment.receivedUnits + payment.correctionUnits;
  const tokenY = isOriginal
    ? mix(
        motion.ramp(frame, 36, motion.scale(24), motion.travel.easing),
        y + 4,
        y + 24,
      )
    : mix(
        motion.ramp(
          frame,
          72 + index * motion.scaleStagger(4),
          motion.scale(32),
          motion.travel.easing,
        ),
        y + 92,
        y + 24,
      );
  const isHandling =
    isCorrection &&
    unitIndex === payment.receivedUnits &&
    frame >= 72 + index * motion.scaleStagger(4) &&
    frame <= 104 + index * motion.scaleStagger(4);
  return { x, y, isOriginal, isCorrection, tokenY, isHandling };
}
