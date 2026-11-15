import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
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
  const { currentAllowance, expandedAllowance } = input.allowances;
  const extension =
    input.choice.decision === "expand" ? ramp(frame, 81, 25, EASE.inOut) : 0;
  const width =
    20 +
    86 *
      (currentAllowance.limit +
        (expandedAllowance.limit - currentAllowance.limit) * extension);
  const hinge = 80 + 20 + 86 * currentAllowance.limit;
  return (
    <g>
      <path
        data-capacity-tray=""
        d={`M80 220 H${80 + width} V390 H80 Z`}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        data-tray-hinge=""
        d={`M${hinge} 390 L${hinge + 86 * (expandedAllowance.limit - currentAllowance.limit) * extension} ${390 - 170 * (1 - extension)}`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <CapacitySlots {...{ input, width, extension, accent }} />
    </g>
  );
}
