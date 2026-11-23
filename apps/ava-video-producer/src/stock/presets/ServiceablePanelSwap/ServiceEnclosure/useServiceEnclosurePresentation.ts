import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getServiceSceneFromFrame } from "../getServiceSceneFromFrame";
import type { Input } from "../ServiceablePanelSwap.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  input: Input;
  scene: ReturnType<typeof getServiceSceneFromFrame>;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  scene: Options["scene"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns enclosure input, scene state, and theme values for
 * `ServiceModuleLatch`, `ServiceEnclosure`, `ServiceEnclosureBody`.
 */
export function useServiceEnclosurePresentation({
  input,
  scene,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { input, scene, tokens, scales };
}
