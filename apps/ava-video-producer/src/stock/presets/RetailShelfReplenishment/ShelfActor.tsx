import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  role: "retailer" | "shopper";
  x: number;
  y: number;
  handX: number;
  handY: number;
  accent: string;
};
/** Connected limbs follow pointing, ordering, loading and shopper handling. */
export function ShelfActor({
  role,
  x,
  y,
  handX,
  handY,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <PersonGlyph
        x={x}
        y={y}
        size={40}
        color={accent}
        role={role === "retailer" ? "worker" : "participant"}
      />
      <ActorArm {...{ role, x, y, handX, handY, accent }} />
      <circle
        data-retailer-hand={role === "retailer" ? "" : undefined}
        data-shopper-hand={role === "shopper" ? "" : undefined}
        cx={handX}
        cy={handY}
        r={3.5}
        fill={accent}
      />
    </g>
  );
}

/** The actor's arm from body through elbow to hand. */
function ActorArm({
  role,
  x,
  y,
  handX,
  handY,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
