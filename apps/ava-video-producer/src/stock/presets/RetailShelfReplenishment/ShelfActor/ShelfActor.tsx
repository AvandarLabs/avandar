import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { ActorArm } from "./ActorArm";
import { type Props } from "./ShelfActorShared.types";
import type { ReactNode } from "react";
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
