import { Motion } from "../../../motion";
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
/** Samples the sum's chained move through its gap into the derived field. */
function _getSpineSumPosition({
  groupStart,
  entityIndex,
  frame,
  motion,
}: Readonly<{
  groupStart: number;
  entityIndex: number;
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
}>): { x: number; y: number } {
  const gapY = 216 + entityIndex * 100,
    fieldY = 138 + entityIndex * 100;
  // The sum's moves are chained cue to cue: down to the gap at 106, across
  // at 115, and up into the field at 128, landing as the values show at 139.
  const travel = motion.travel.easing;
  const x = Motion.mix({
    t: Motion.ramp({ frame, at: 115, dur: 128 - 115, easing: travel }),
    from: 235,
    to: 690,
  });
  const y =
    Motion.mix({
      t: Motion.ramp({ frame, at: 106, dur: 115 - 106, easing: travel }),
      from: groupStart + 36,
      to: gapY,
    }) +
    (fieldY - gapY) *
      Motion.ramp({ frame, at: 128, dur: 139 - 128, easing: travel });
  return { x, y };
}

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
  const { x, y } = _getSpineSumPosition({
    groupStart,
    entityIndex,
    frame,
    motion,
  });
  return (
    <g
      data-spine-sum={observation.entityId}
      opacity={Motion.ramp({
        frame,
        at: 100,
        dur: motion.scale(APPEAR_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <LabelSlots labels={[[String(sum), x, y, 216, 12, 1]]} />
    </g>
  );
}
