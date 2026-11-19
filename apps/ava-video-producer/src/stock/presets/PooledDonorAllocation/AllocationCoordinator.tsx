import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getAllocationHandlingFromTokens } from "./getAllocationHandlingFromTokens";
import type { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
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
  const motion = useGraphicMotion();
  const graphicTokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      <g data-coordinator-arm>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${pose.bodyX} ${pose.bodyY} L${pose.bodyX - 12} ${pose.handY - 4} L${pose.handX} ${pose.handY}`,
          }}
          profile={graphicTokens.sketch.shape}
          stroke={graphicTokens.color.accentAlt}
          strokeWidth={scales.stroke(2.5)}
          fill="none"
        />
      </g>
      <circle
        data-coordinator-hand
        cx={pose.handX}
        cy={pose.handY}
        r={3.5}
        fill={graphicTokens.color.accentAlt}
      />
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
