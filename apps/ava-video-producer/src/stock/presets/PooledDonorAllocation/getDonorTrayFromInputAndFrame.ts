import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PooledDonorAllocation.schema";
/** Data for getDonorTrayFromInputAndFrame. */
type GetDonorTrayResult = {
  x: number;
  y: number;
  cosine: number;
  sine: number;
};

/**
 * The contributor tips the support while token identities stay upright and
 * readable.
 */
export function getDonorTrayFromInputAndFrame({
  input,
  frame,
  donorIndex,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  donorIndex: number;
  motion: VideoMotion;
}>): GetDonorTrayResult {
  const angle =
    0.22 *
    motion.reveal(frame, 18) *
    (1 - motion.ramp(frame, 62, motion.whip, motion.exit.easing));
  return {
    x: 64 + (donorIndex * 880) / input.contributions.length,
    y: 148,
    cosine: Math.cos(angle),
    sine: Math.sin(angle),
  };
}
