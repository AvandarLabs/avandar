import { SketchedShape } from "../primitives/SketchedShape";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { cx: number; cy: number; rx: number; ry: number };
/** A themed dashed guide ellipse, such as an orbit. */
export function Guide({ cx, cy, rx, ry }: Readonly<Props>): ReactNode {
  const guide = GraphicThemeHooks.useGraphicProps("Guide", {});
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "ellipse", cx, cy, rx, ry }}
      profile={guide.sketch}
      fill="none"
      stroke={guide.color}
      strokeWidth={scales.stroke(guide.strokeWidth)}
      strokeDasharray={guide.dash.length ? guide.dash.join(" ") : undefined}
      opacity={guide.alpha}
    />
  );
}
