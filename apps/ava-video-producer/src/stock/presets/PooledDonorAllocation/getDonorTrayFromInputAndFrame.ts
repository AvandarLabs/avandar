import { ramp } from "../../../motion";
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
}: Readonly<{
  input: Input;
  frame: number;
  donorIndex: number;
}>): GetDonorTrayResult {
  const angle = 0.22 * ramp(frame, 18, 12) * (1 - ramp(frame, 62, 8));
  return {
    x: 64 + (donorIndex * 880) / input.contributions.length,
    y: 148,
    cosine: Math.cos(angle),
    sine: Math.sin(angle),
  };
}
