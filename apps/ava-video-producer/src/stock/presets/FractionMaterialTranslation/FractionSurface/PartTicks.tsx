import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../FractionMaterialTranslation.schema";
import type { ReactNode } from "react";
/** A tick over each counted part of the fraction. */
export function PartTicks({
  fraction,
  accent,
}: Readonly<{ fraction: Input["fraction"]; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return Array.from({ length: fraction.numerator }, (_, part) => {
    return (
      <SketchedShape
        key={part}
        shape={{
          kind: "path",
          d: `M${-96 + ((part + 0.5) * 192) / fraction.denominator} 30 V46`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
      />
    );
  });
}
