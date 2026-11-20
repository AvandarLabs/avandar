import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getSpineContributionFromFrame } from "./getSpineContributionFromFrame";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  observation: Input["observations"][number];
  index: number;
  frame: number;
};
/** Frames a sum takes to fade in. */
const APPEAR_FRAMES = 5;
/** The collapsed sum follows a clear gap before entering its derived field. */
export function SpineSum({
  input,
  observation,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { groupStart, entityIndex, sum } = getSpineContributionFromFrame({
    input,
    observation,
    index,
    frame,
    motion,
  });
  const gapY = 216 + entityIndex * 100,
    fieldY = 138 + entityIndex * 100;
  // The sum's moves are chained cue to cue: down to the gap at 106, across
  // at 115, and up into the field at 128, landing as the values show at 139.
  const travel = motion.travel.easing;
  const x = mix(ramp(frame, 115, 128 - 115, travel), 235, 690);
  const y =
    mix(ramp(frame, 106, 115 - 106, travel), groupStart + 36, gapY) +
    (fieldY - gapY) * ramp(frame, 128, 139 - 128, travel);
  return (
    <g
      data-spine-sum={observation.entityId}
      opacity={ramp(
        frame,
        100,
        motion.scale(APPEAR_FRAMES),
        motion.reveal.easing,
      )}
    >
      <LabelSlots labels={[[String(sum), x, y, 216, 12, 1]]} />
    </g>
  );
}
