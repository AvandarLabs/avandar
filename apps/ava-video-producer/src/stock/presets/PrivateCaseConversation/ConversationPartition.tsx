import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { frame: number; partition: "door" | "screen" };
/** Both separators close only after the supporter clears the doorway. */
export function ConversationPartition({
  frame,
  partition,
}: Readonly<Props>): ReactNode {
  const closure = ramp(frame, 86, 22);
  return (
    <g data-partition={partition} data-closed={closure === 1}>
      <path
        d="M623 150 V310 M623 450 V510"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={6}
      />
      {partition === "screen" ? (
        <rect
          data-separator-shape="screen"
          x={617}
          y={310}
          width={12}
          height={140 * closure}
          fill={STOCK.cyan}
          fillOpacity={0.45}
          stroke={STOCK.cyan}
        />
      ) : (
        <path
          data-separator-shape="door"
          d={`M623 310 L${623 + 90 * (1 - closure)} ${310 + 140 * closure} L${631 + 90 * (1 - closure)} ${310 + 140 * closure} L631 310 Z`}
          fill={STOCK.surface}
          stroke={STOCK.cyan}
          strokeWidth={2}
        />
      )}
    </g>
  );
}
