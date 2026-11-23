import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getAllocationHandlingFromTokens } from "../getAllocationHandlingFromTokens";
import { CoordinatorArm } from "./CoordinatorArm";
import type { getAllocationTokensFromInputAndFrame } from "../getAllocationTokensFromInputAndFrame";
import type { Input } from "../PooledDonorAllocation.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  tokens: ReturnType<typeof getAllocationTokensFromInputAndFrame>;
};
/**
 * The coordinator physically slides the clear scoop and withdraws after
 * release.
 */
export function AllocationCoordinator({
  input,
  frame,
  tokens,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const graphicTokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const pose = getAllocationHandlingFromTokens({
    input,
    frame,
    tokens,
    motion,
  });
  return (
    <g>
      <PersonGlyph
        x={pose.bodyX}
        y={pose.bodyY}
        size={32}
        role="facilitator"
        color={graphicTokens.color.accentAlt}
      />
      <CoordinatorArm pose={pose} />
      <g data-allocation-scoop>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${pose.left} ${pose.top} L${pose.left} ${pose.bottom} L${pose.right} ${pose.bottom} L${pose.right} ${pose.top}`,
          }}
          profile={graphicTokens.sketch.shape}
          stroke={graphicTokens.color.accentAlt}
          strokeWidth={scales.stroke(graphicTokens.stroke.outline)}
          fill="none"
          opacity={pose.opacity}
        />
      </g>
    </g>
  );
}
