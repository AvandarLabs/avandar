import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PooledDonorAllocation.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  allocatedCredits: number;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  index: Options["index"];
  frame: Options["frame"];
  accent: Options["accent"];
  allocatedCredits: Options["allocatedCredits"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  request: { id: string; label: string };
  width: number;
  x: number;
  top: number;
};

/**
 * Returns the selected request, envelope placement, and motion values for
 * `AllocationCreditTotal`, `FundingEnvelope`.
 */
export function useFundingEnvelopePresentation({
  input,
  index,
  frame,
  accent,
  allocatedCredits,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const request = input.requests[index];
  const width = 880 / input.requests.length;
  const x = 40 + index * width;
  const offset =
    input.envelopeArrangement === "fan"
      ? Math.abs(index - (input.requests.length - 1) / 2) * 12
      : 0;
  const top = 425 + offset;
  return {
    input,
    index,
    frame,
    accent,
    allocatedCredits,
    tokens,
    motion,
    request,
    width,
    x,
    top,
  };
}
