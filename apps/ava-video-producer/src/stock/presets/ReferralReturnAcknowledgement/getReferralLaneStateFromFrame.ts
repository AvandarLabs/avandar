import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ReferralReturnAcknowledgement.schema";

type ReferralLaneState = {
  travel: number;
  x: number;
  y: number;
  returned: boolean;
  receiptX: number;
  state: "closed" | "attendedOpen" | "waiting";
};

type TravelOptions = {
  referral: Readonly<{
    referral: Input["referrals"][number];
    index: number;
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["referral"];
  index: Readonly<{
    referral: Input["referrals"][number];
    index: number;
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["index"];
  frame: Readonly<{
    referral: Input["referrals"][number];
    index: number;
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["frame"];
  input: Readonly<{
    referral: Input["referrals"][number];
    index: number;
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["input"];
  motion: Readonly<{
    referral: Input["referrals"][number];
    index: number;
    frame: number;
    input: Input;
    motion: VideoMotion;
  }>["motion"];
};

type TravelResult = {
  travel: number;
  x: number;
  y: number;
  returned:
    | Readonly<{
        referral: Input["referrals"][number];
        index: number;
        frame: number;
        input: Input;
        motion: VideoMotion;
      }>["referral"]["acknowledged"]
    | boolean;
  receiptX: number;
};

/**
 * Samples the referral lane state from frame travel state for the current
 * authored frame.
 */
function _getReferralLaneStateFromFrameTravelState({
  referral,
  index,
  frame,
  input,
  motion,
}: Readonly<TravelOptions>): TravelResult {
  const travel = referral.attended
    ? motion.ramp(
        frame,
        41 + index * motion.stagger.list,
        motion.scale(36),
        motion.travel.easing,
      )
    : 0;
  const x = Motion.mix({
    t: travel,
    from: 180,
    to: 650,
  });
  const y = 162 + index * (input.showLedger ? 58 : 72);
  const returned = referral.acknowledged && frame >= 82 + index * 2;
  const receiptX = Motion.mix({
    t: motion.ramp(
      frame,
      82 + index * motion.stagger.list,
      motion.scale(23),
      motion.travel.easing,
    ),
    from: 616,
    to: 228,
  });
  return { travel, x, y, returned, receiptX };
}

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
  const { travel, x, y, returned, receiptX } =
    _getReferralLaneStateFromFrameTravelState({
      referral,
      index,
      frame,
      input,
      motion,
    });
  const state: "closed" | "attendedOpen" | "waiting" =
    returned && frame >= 105 + index * 2
      ? "closed"
      : travel === 1
        ? "attendedOpen"
        : "waiting";
  return { travel, x, y, returned, receiptX, state };
}
