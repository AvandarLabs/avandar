import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { joining: number; accent: string };

/** The ground line the pieces join along. */
export function FoundationGroundLine({
  joining,
  accent,
}: Readonly<Props>): ReactNode {
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
