import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The ground line the pieces join along. */
export function FoundationGroundLine({
  joining,
  accent,
}: Readonly<{ joining: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d: "M80 550 H880" }}
      profile={tokens.sketch.shape}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      opacity={joining}
    />
  );
}
