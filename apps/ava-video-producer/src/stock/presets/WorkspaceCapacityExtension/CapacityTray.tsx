import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CapacitySlots } from "./CapacitySlots";
import type { Input } from "./WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Persistent tray base with a hinged expanding side and exact slot outlines.
 */
export function CapacityTray({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const { currentAllowance, expandedAllowance } = input.allowances;
  const extension =
    input.choice.decision === "expand"
      ? motion.ramp(frame, 81, motion.scale(25), motion.travel.easing)
      : 0;
  const width =
    20 +
    86 *
      (currentAllowance.limit +
        (expandedAllowance.limit - currentAllowance.limit) * extension);
  const hinge = 80 + 20 + 86 * currentAllowance.limit;
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: `M80 220 H${80 + width} V390 H80 Z` }}
        profile={tokens.sketch.shape}
        data-capacity-tray=""
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${hinge} 390 L${hinge + 86 * (expandedAllowance.limit - currentAllowance.limit) * extension} ${390 - 170 * (1 - extension)}`,
        }}
        profile={tokens.sketch.shape}
        data-tray-hinge=""
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <CapacitySlots {...{ input, width, extension, accent }} />
    </g>
  );
}
