import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** The original consultation table and supporter chair stay in place. */
export function ConversationFurniture(): ReactNode {
  return (
    <g>
      {" "}
      <rect
        x={48}
        y={150}
        width={550}
        height={380}
        rx={20}
        fill="none"
        stroke={STOCK.line}
      />
      <rect
        data-table="meeting"
        x={170}
        y={330}
        width={340}
        height={54}
        rx={22}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <path
        data-original-supporter-chair="empty-after-exit"
        d="M310 397 v54 h48 v-18 M310 451 v18 M358 451 v18"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={4}
      />
    </g>
  );
}
