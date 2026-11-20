import { mix, ramp } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { TRANSFER_CUE, WITHDRAW_CUE } from "./custodyShape";
import type { ReactNode } from "react";
/** The single responsibility marker, crossing once the transfer is accepted. */
export function ResponsibilityMarker({
  frame,
  accepted,
}: Readonly<{ frame: number; accepted: boolean }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  // Responsibility crosses from the acknowledgement until the sender's
  // support withdraws, so this move keeps its cue span.
  const transfer = accepted
    ? ramp(
        frame,
        TRANSFER_CUE,
        WITHDRAW_CUE - TRANSFER_CUE,
        motion.travel.easing,
      )
    : 0;
  return (
    <circle
      data-responsibility="single"
      cx={mix(transfer, 240, 720)}
      cy={415}
      r={9}
      fill={tokens.color.highlight}
    />
  );
}
