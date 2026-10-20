import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { hasTable: boolean; progress: number; accent: string };
/** Classroom Table for the authored scene. */
export function ClassroomTable({
  hasTable,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-shared-table={hasTable}
      transform={`translate(380 370) rotate(${hasTable ? mix(progress, -12, 0) : -12})`}
    >
      <rect
        x={-95}
        y={-35}
        width={190}
        height={70}
        rx={18}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d="M-32 -10 L-14 16 L-50 16 Z M12 -12 H38 V14 H12 Z"
        fill="none"
        stroke={STOCK.mint}
        strokeWidth={2}
      />
    </g>
  );
}
