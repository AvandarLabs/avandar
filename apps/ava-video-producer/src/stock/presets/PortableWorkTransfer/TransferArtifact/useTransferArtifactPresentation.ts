import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../PortableWorkTransfer.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = {
  artifact: Input["artifacts"][number];
  x: number;
  y: number;
  isCopy: boolean;
  showIdentityTabs: boolean;
  accent: string;
};

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  artifact: Options["artifact"];
  x: Options["x"];
  y: Options["y"];
  isCopy: Options["isCopy"];
  showIdentityTabs: Options["showIdentityTabs"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns artifact identity, copy state, placement, and theme values for
 * `TransferArtifactLabels`, `TransferArtifact`.
 */
export function useTransferArtifactPresentation({
  artifact,
  x,
  y,
  isCopy,
  showIdentityTabs,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { artifact, x, y, isCopy, showIdentityTabs, accent, tokens, scales };
}
