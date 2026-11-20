import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** Brackets at both ends of the deck when the premises are necessary. */
export function RequiredBrackets({
  deck,
  accent,
}: Readonly<{ deck: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-required-brackets="true">
      <SketchedShape
        shape={{ kind: "path", d: "M30 330 V370 H50 M930 330 V370 H910" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        opacity={deck}
      />
    </g>
  );
}
