import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";

/** The normalised path length the overflow path draws on along. */
const DRAW_ON_LENGTH = 1;
type Props = { input: Input; frame: number };
/** Excess water traverses a distinct crest only after detention has filled. */
export function WaterSpill({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const incoming = input.event.incomingM3;
  const remainder =
    incoming - (input.event.infiltratedM3 + input.event.dischargedM3);
  const overflow = remainder - Math.min(input.detentionCapacityM3, remainder);
  const progress = motion.ramp(
    frame,
    84,
    motion.scale(24),
    motion.travel.easing,
  );
  const lip = 380 - Math.min(input.detentionCapacityM3 / incoming, 1) * 140;
  const crest = input.overflowSide === "left" ? 340 : 620;
  const outside = input.overflowSide === "left" ? 80 : 880;
  return (
    <g>
      <g data-crest="physical">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${crest} ${lip + 10}V${lip - 10}H${outside}V400`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={
            tokens.color.categorical[WATER_DESTINATIONS.overflow.category]
          }
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          pathLength={DRAW_ON_LENGTH}
          strokeDasharray={DRAW_ON_LENGTH}
          strokeDashoffset={DRAW_ON_LENGTH - progress}
          opacity={overflow > 0 ? 1 : 0}
        />
      </g>
      <rect
        data-overflow-pool="physical"
        x={outside - 25}
        y={400}
        width={((50 * overflow) / incoming) * progress}
        height={12}
        fill={tokens.color.categorical[WATER_DESTINATIONS.overflow.category]}
      />
    </g>
  );
}
