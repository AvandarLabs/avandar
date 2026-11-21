import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { TRANSFER_CUE, WITHDRAW_CUE } from "./custodyShape";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accepted: boolean;
};
/** The single responsibility marker, crossing once the transfer is accepted. */
export function ResponsibilityMarker({
  frame,
  accepted,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  // Responsibility crosses from the acknowledgement until the sender's
  // support withdraws, so this move keeps its cue span.
  const transfer = accepted
    ? Motion.ramp({
        frame,
        at: TRANSFER_CUE,
        dur: WITHDRAW_CUE - TRANSFER_CUE,
        easing: motion.travel.easing,
      })
    : 0;
  return (
    <circle
      data-responsibility="single"
      cx={Motion.mix({
        t: transfer,
        from: 240,
        to: 720,
      })}
      cy={415}
      r={9}
      fill={tokens.color.highlight}
    />
  );
}
