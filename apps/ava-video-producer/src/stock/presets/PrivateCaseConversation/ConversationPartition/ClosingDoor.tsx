import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A door swinging shut across the doorway. */
export function ClosingDoor({
  closure,
}: Readonly<{ closure: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-separator-shape="door">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M623 310 L${623 + 90 * (1 - closure)} ${310 + 140 * closure} L${631 + 90 * (1 - closure)} ${310 + 140 * closure} L631 310 Z`,
        }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
