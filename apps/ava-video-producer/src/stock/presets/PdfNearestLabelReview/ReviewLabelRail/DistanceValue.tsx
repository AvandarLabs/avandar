import { ramp } from "../../../../motion";
import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReviewTiming } from "../ReviewTiming";
import type { ReactNode } from "react";

type Props = { labelId: string; distance: number; y: number; frame: number };
/** The measured distance, shown while the measure holds. */
export function DistanceValue({
  labelId,
  distance,
  y,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      data-distance-value={labelId}
      opacity={ramp(
        frame,
        ReviewTiming.MEASURE_CUE,
        ReviewTiming.STATUS_CUE - ReviewTiming.MEASURE_CUE,
        motion.reveal.easing,
      )}
    >
      <LiteralDataText
        value={`≈ ${distance.toPrecision(3)}`}
        x={582}
        y={y + 78}
      />
    </g>
  );
}
