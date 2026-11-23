import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { y: number };

/** Unlabelled strokes standing in for the input text. */
export function InputPlaceholder({ y }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M214 ${y + 20} h490 M214 ${y + 38} h418` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}
