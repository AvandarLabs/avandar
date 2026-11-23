import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReferralLaneStateFromFrame } from "../getReferralLaneStateFromFrame";
import { ReferralLaneContent } from "./ReferralLaneContent";
import type { Input } from "../ReferralReturnAcknowledgement.schema";
import type { ReactNode } from "react";

type Props = {
  referral: Input["referrals"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
};

/**
 * Each lane keeps its person, outward referral slip and possible return
 * receipt.
 */
export function ReferralLane({
  referral,
  index,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { travel, x, y, returned, receiptX, state } =
    getReferralLaneStateFromFrame({ referral, index, frame, input, motion });
  const drawing = {
    referral,
    input,
    accent,
    tokens,
    travel,
    x,
    y,
    state,
    scales,
    returned,
    receiptX,
  };
  return (
    <ReferralLaneContent
      index={index}
      frame={frame}
      input={input}
      tokens={tokens}
      motion={motion}
      y={y}
      drawing={drawing}
    />
  );
}
