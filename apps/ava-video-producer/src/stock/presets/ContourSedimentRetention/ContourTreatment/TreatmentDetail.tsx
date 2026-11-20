import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { isVegetated: boolean; x: number; y: number; accent: string };
/** Stems on a vegetated strip, or courses on a stone bund. */
export function TreatmentDetail({
  isVegetated,
  x,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  if (isVegetated) {
    return (
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 12} ${y + 55}V${y - 14}M${x + 12} ${y + 10}l-16 -20M${x + 12} ${y + 28}l20 -20`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    );
  }
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} ${y + 20}h24M${x} ${y + 43}h24` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.text}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
