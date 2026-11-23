import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RetailShelfReplenishment.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  good: Input["goods"][number];
  unitIndex: number;
  x: number;
  y: number;
  owner: string;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  good: Options["good"];
  unitIndex: Options["unitIndex"];
  x: Options["x"];
  y: Options["y"];
  owner: Options["owner"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns good identity, unit ownership, position, and theme values for
 * `ShelfUnit`, `ShelfGoodBody`.
 */
export function useShelfUnitPresentation({
  good,
  unitIndex,
  x,
  y,
  owner,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { good, unitIndex, x, y, owner, accent, tokens, scales };
}
