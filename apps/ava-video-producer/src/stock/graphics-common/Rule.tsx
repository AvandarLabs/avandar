import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x1: number;
  x2: number;
  y: number;
};
/** A themed horizontal divider. */
export function Rule({ x1, x2, y }: Readonly<Props>): ReactNode {
  const rule = GraphicThemeHooks.useGraphicProps({
    name: "Rule",
    props: {},
  });
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "line", x1, y1: y, x2, y2: y }}
      profile={sketch.shape}
      stroke={rule.color}
      strokeWidth={scales.stroke(rule.strokeWidth)}
    />
  );
}
