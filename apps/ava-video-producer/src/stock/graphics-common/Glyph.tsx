import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed icon glyph outline drawn inside a shape. */
export function Glyph({ d, color }: { d: string; color: string }): ReactNode {
  const glyph = useGraphicProps("Glyph", {});
  const { sketch } = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
