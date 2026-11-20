import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The opaque top flap, folding down last to close the cover. */
export function FinalFlap({
  fold,
  accent,
}: Readonly<{ fold: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M0 0 L268 ${mix(fold, -84, 134)} L536 0 z` }}
      profile={tokens.sketch.shape}
      data-final-flap="opaque"
      fill={tokens.color.surface}
      stroke={accent}
    />
  );
}
