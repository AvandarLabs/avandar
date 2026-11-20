import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: { d: string; color: string }): ReactNode {
  const glyph = GraphicThemeHooks.useGraphicProps("Glyph", {});
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d }}
      profile={sketch.shape}
      fill="none"
      stroke={color}
      strokeWidth={scales.stroke(glyph.strokeWidth)}
    />
  );
}
