import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  d: string;
  color: string;
};
/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: Readonly<Props>): ReactNode {
  const glyph = GraphicThemeHooks.useGraphicProps({
    name: "Glyph",
    props: {},
  });
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
