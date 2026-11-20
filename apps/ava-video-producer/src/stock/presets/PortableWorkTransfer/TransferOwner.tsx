import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getTransferSceneFromFrame } from "./getTransferSceneFromFrame";
import type { ReactNode } from "react";
/** Inputs for TransferOwner. */
type Props = { scene: ReturnType<typeof getTransferSceneFromFrame> };
/** The owner's articulated hand follows the copy or loaded folio handle. */
export function TransferOwner({ scene }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <PersonGlyph
        x={scene.ownerX}
        y={scene.ownerY}
        role="worker"
        color={tokens.color.highlight}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${scene.ownerX} ${scene.ownerY} L${scene.ownerX} ${scene.hand.y - 10} L${scene.hand.x} ${scene.hand.y}`,
        }}
        profile={tokens.sketch.shape}
        data-owner-arm="true"
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-owner-hand="true"
        cx={scene.hand.x}
        cy={scene.hand.y}
        r={5}
        fill={tokens.color.highlight}
      />
    </g>
  );
}
