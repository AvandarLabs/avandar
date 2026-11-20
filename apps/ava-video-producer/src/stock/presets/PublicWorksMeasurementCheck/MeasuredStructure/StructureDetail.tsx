import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Courses across a low wall, or posts at both ends of anything else. */
export function StructureDetail({
  isLowWall,
  width,
  accent,
}: Readonly<{ isLowWall: boolean; width: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  if (isLowWall) {
    return (
      <SketchedShape
        shape={{
          kind: "path",
          d: `M200 305 H${200 + width} M200 335 H${200 + width}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        opacity={tokens.alpha.dimmed}
      />
    );
  }
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M200 285 V360 M${200 + width} 285 V360` }}
      profile={tokens.sketch.shape}
      stroke={accent}
      strokeWidth={scales.stroke(6)}
    />
  );
}
