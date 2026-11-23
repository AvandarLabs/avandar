import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SpecimenAliquotBalance.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  tube: Input["parent"];
  parentId: string;
  x: number;
  volume: number;
  showIdentity: boolean;
  accent: string;
  isChild?: boolean;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  tube: Options["tube"];
  parentId: Options["parentId"];
  x: Options["x"];
  volume: Options["volume"];
  showIdentity: Options["showIdentity"];
  accent: Options["accent"];
  isChild: boolean;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns tube identity, volume, placement, and theme values for
 * `AliquotTubeOutline`, `AliquotTube`.
 */
export function useAliquotTubePresentation({
  tube,
  parentId,
  x,
  volume,
  showIdentity,
  accent,
  isChild = false,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return {
    tube,
    parentId,
    x,
    volume,
    showIdentity,
    accent,
    isChild,
    atomic,
    tokens,
    scales,
  };
}
