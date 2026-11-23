import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { ExpertiseRoleExchangeTopicAttribution } from "../ExpertiseRoleExchangeTopicAttribution/ExpertiseRoleExchangeTopicAttribution";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

const SUMMARY_FRAMES = 8;
const CLOSING_FRAMES = 10;
type Props = {
  frame: number;
  input: Input;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Reveals topic attribution before the closing authored summary. */
export function ExpertiseClosingSummary({
  frame,
  input,
  motion,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g
        opacity={Motion.ramp({
          frame,
          at: 131,
          dur: motion.scale(SUMMARY_FRAMES),
          easing: motion.reveal.easing,
        })}
      >
        <ExpertiseRoleExchangeTopicAttribution input={input} />
      </g>
      <g
        opacity={Motion.ramp({
          frame,
          at: 137,
          dur: motion.scale(CLOSING_FRAMES),
          easing: motion.reveal.easing,
        })}
      >
        <LabelSlots labels={[[input.closingLabel, 60, 580, 840, 14, 1]]} />
      </g>
    </>
  );
}
