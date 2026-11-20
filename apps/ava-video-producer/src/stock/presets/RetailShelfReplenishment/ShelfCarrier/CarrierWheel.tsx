import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A wheel: large on a cargo bike, small on a trolley. */
export function CarrierWheel({
  cx,
  isBike,
}: Readonly<{ cx: number; isBike: boolean }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "circle", cx, cy: 424, r: isBike ? 20 : 10 }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}
