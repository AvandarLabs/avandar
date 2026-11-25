import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../TravelTimeNetworkFrontier.schema";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/**
 * Returns destination input, frame, accent, and theme values for
 * `NetworkDestinations`.
 */
export function useNetworkDestinationsPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return { input, frame, accent, tokens };
}
