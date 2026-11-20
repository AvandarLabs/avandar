import { mix } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ReferralReturnAcknowledgement.schema";

type ReferralLaneState = {
  travel: number;
  x: number;
  y: number;
  returned: boolean;
  receiptX: number;
  state: "closed" | "attendedOpen" | "waiting";
};

/** Travel and acknowledgement timing determine the lane's ledger state. */
export function getReferralLaneStateFromFrame({
  referral,
  index,
  frame,
  input,
  motion,
}: Readonly<{
  referral: Input["referrals"][number];
  index: number;
  frame: number;
  input: Input;
  motion: VideoMotion;
}>): ReferralLaneState {
  const travel = referral.attended
    ? motion.ramp(
        frame,
        41 + index * motion.stagger.list,
        motion.scale(36),
        motion.travel.easing,
      )
    : 0;
  const x = mix(travel, 180, 650);
  const y = 162 + index * (input.showLedger ? 58 : 72);
  const returned = referral.acknowledged && frame >= 82 + index * 2;
  const receiptX = mix(
    motion.ramp(
      frame,
      82 + index * motion.stagger.list,
      motion.scale(23),
      motion.travel.easing,
    ),
    616,
    228,
  );
  const state: "closed" | "attendedOpen" | "waiting" =
    returned && frame >= 105 + index * 2
      ? "closed"
      : travel === 1
        ? "attendedOpen"
        : "waiting";
  return { travel, x, y, returned, receiptX, state };
}
