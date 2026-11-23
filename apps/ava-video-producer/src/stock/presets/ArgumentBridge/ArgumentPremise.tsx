import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PremiseStrip } from "./PremiseStrip";
import { PremiseSupport } from "./PremiseSupport/PremiseSupport";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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
  count: numPremises,
  showSupport,
  relationship,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const slotWidth = 900 / numPremises;
  const x = 30 + index * slotWidth;
  const center = x + slotWidth / 2;
  const { arrival, joining } = _getPremiseProgress({ frame, index, motion });
  return (
    <g
      data-premise={premise.id}
      opacity={arrival}
      transform={`translate(0 ${Motion.mix({
        t: arrival,
        from: 12,
        to: 0,
      })})`}
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
function _getPremiseProgress({
  frame,
  index,
  motion,
}: Readonly<{
  frame: number;
  index: number;
  motion: VideoMotion;
}>) {
  return {
    arrival: Motion.ramp({
      frame,
      at: 12 + index * motion.scaleStagger(ARRIVAL_STAGGER_FRAMES),
      dur: motion.hero,
      easing: motion.entrance.easing,
    }),
    joining: Motion.ramp({
      frame,
      at: 48 + index * motion.scaleStagger(JOIN_STAGGER_FRAMES),
      dur: motion.scale(JOIN_FRAMES),
      easing: motion.travel.easing,
    }),
  };
}
