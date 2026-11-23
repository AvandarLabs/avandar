import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { WATER_DESTINATIONS } from "./waterDestinationKeys";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
/** The normalised path length the overflow path draws on along. */
const DRAW_ON_LENGTH = 1;
type Props = { input: Input; frame: number };
/** Excess water traverses a distinct crest only after detention has filled. */
export function WaterSpill({ input, frame }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const incoming = input.event.incomingM3;
  const overflow = _getOverflowVolume(input);
  const progress = motion.ramp(
    frame,
    84,
    motion.scale(24),
    motion.travel.easing,
  );
  const { lip, crest, outside } = _getCrestGeometry(input);
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
/** The water left after infiltration, discharge, and full detention. */
function _getOverflowVolume(input: Input): number {
  const remainder =
    input.event.incomingM3 -
    (input.event.infiltratedM3 + input.event.dischargedM3);
  return remainder - Math.min(input.detentionCapacityM3, remainder);
}
/** The detention lip's height and the crest and outfall on the spill side. */
function _getCrestGeometry(input: Input) {
  return {
    lip:
      380 -
      Math.min(input.detentionCapacityM3 / input.event.incomingM3, 1) * 140,
    crest: input.overflowSide === "left" ? 340 : 620,
    outside: input.overflowSide === "left" ? 80 : 880,
  };
}
