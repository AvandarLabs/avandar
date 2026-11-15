import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import type { ReactNode } from "react";
/** Inputs for TransferOwner. */
type Props = { scene: ReturnType<typeof getTransferSceneFromFrame> };

/** The owner's articulated hand follows the copy or loaded folio handle. */
export function TransferOwner({ scene }: Readonly<Props>): ReactNode {
  return (
    <g>
      <PersonGlyph
        x={scene.ownerX}
        y={scene.ownerY}
        role="worker"
        color={STOCK.orange}
      />
      <path
        data-owner-arm="true"
        d={`M${scene.ownerX} ${scene.ownerY} L${scene.ownerX} ${scene.hand.y - 10} L${scene.hand.x} ${scene.hand.y}`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      <circle
        data-owner-hand="true"
        cx={scene.hand.x}
        cy={scene.hand.y}
        r={5}
        fill={STOCK.orange}
      />
    </g>
  );
}
