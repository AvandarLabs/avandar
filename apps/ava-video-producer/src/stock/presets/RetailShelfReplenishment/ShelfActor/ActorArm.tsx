import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./ShelfActorShared.types";
import type { ReactNode } from "react";
/** The actor's arm from body through elbow to hand. */
export function ActorArm({
  role,
  x,
  y,
  handX,
  handY,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-retailer-arm={role === "retailer" ? "" : undefined}
      data-shopper-arm={role === "shopper" ? "" : undefined}
    >
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y} L${(x + handX) / 2} ${handY + 16} L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}
