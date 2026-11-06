import { ramp, EASE } from "../../../motion";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Excess water traverses a distinct crest only after detention has filled. */
export function WaterSpill({ input, frame }: Readonly<Props>): ReactNode {
  const incoming = input.event.incomingM3;
  const remainder =
    incoming - (input.event.infiltratedM3 + input.event.dischargedM3);
  const overflow = remainder - Math.min(input.detentionCapacityM3, remainder);
  const progress = ramp(frame, 84, 24, EASE.inOut);
  const lip = 380 - Math.min(input.detentionCapacityM3 / incoming, 1) * 140;
  const crest = input.overflowSide === "left" ? 340 : 620;
  const outside = input.overflowSide === "left" ? 80 : 880;
  return (
    <g>
      <path
        data-crest="physical"
        d={`M${crest} ${lip + 10}V${lip - 10}H${outside}V400`}
        fill="none"
        stroke={WATER_DESTINATIONS.overflow.color}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        opacity={overflow > 0 ? 1 : 0}
      />
      <rect
        data-overflow-pool="physical"
        x={outside - 25}
        y={400}
        width={((50 * overflow) / incoming) * progress}
        height={12}
        fill={WATER_DESTINATIONS.overflow.color}
      />
    </g>
  );
}
