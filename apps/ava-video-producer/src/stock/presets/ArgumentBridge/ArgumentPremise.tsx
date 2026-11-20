import { mix, ramp } from "../../../motion";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { PremiseStrip } from "./PremiseStrip";
import { PremiseSupport } from "./PremiseSupport";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  premise: Input["premises"][number];
  index: number;
  count: number;
  showSupport: boolean;
  relationship: Input["relationship"];
};

/** Frames between neighbouring premises arriving. */
const ARRIVAL_STAGGER_FRAMES = 6;
/** Frames between neighbouring premises joining the deck. */
const JOIN_STAGGER_FRAMES = 4;
/** Frames a premise's arms take to reach the deck. */
const JOIN_FRAMES = 28;
/** Each reason remains readable below its own joining section of the deck. */
export function ArgumentPremise({
  frame,
  accent,
  premise,
  index,
  count,
  showSupport,
  relationship,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const slotWidth = 900 / count;
  const x = 30 + index * slotWidth;
  const center = x + slotWidth / 2;
  const { arrival, joining } = _getPremiseProgress(frame, index, motion);
  return (
    <g
      data-premise={premise.id}
      opacity={arrival}
      transform={`translate(0 ${mix(arrival, 12, 0)})`}
    >
      <PremiseStrip {...{ premise, x, center, slotWidth }} />
      <PremiseSupport
        {...{
          joining,
          center,
          x,
          slotWidth,
          accent,
          premise,
          showSupport,
          relationship,
        }}
      />
    </g>
  );
}

/** A premise's arrival and its arms joining the deck, both 0 to 1. */
function _getPremiseProgress(
  frame: number,
  index: number,
  motion: VideoMotion,
) {
  return {
    arrival: ramp(
      frame,
      12 + index * motion.scaleStagger(ARRIVAL_STAGGER_FRAMES),
      motion.hero,
      motion.entrance.easing,
    ),
    joining: ramp(
      frame,
      48 + index * motion.scaleStagger(JOIN_STAGGER_FRAMES),
      motion.scale(JOIN_FRAMES),
      motion.travel.easing,
    ),
  };
}
