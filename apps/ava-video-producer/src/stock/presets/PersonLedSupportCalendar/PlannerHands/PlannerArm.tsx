import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** An articulated arm from shoulder through elbow to its hand. */
export function PlannerArm({
  path,
  color,
}: Readonly<{ path: string; color: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={color}
      strokeWidth={scales.stroke(tokens.stroke.heavy)}
    />
  );
}
