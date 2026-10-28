import { STOCK } from "../../stockPalette";
import type { Input } from "./WorkspaceCapacityExtension.schema";
import type { ReactNode } from "react";
type Props = { input: Input; width: number; extension: number; accent: string };
/** Additional slot outlines remain within the physically unfolding tray. */
export function CapacitySlots({
  input,
  width,
  extension,
  accent,
}: Readonly<Props>): ReactNode {
  const current = input.allowances.currentAllowance.limit;
  const numVisibleSlots =
    extension > 0 ? input.allowances.expandedAllowance.limit : current;
  return (
    <g>
      {Array.from({ length: numVisibleSlots }, (_, index) => {
        const isExtra = index >= current;
        const x = 87 + index * 86;
        const slotWidth = isExtra
          ? Math.max(0, Math.min(84, 80 + width - 7 - x))
          : 84;
        return slotWidth > 0 ? (
          <rect
            key={index}
            data-current-slot={isExtra ? undefined : index}
            data-extra-slot={isExtra ? index - current : undefined}
            x={x}
            y={232}
            width={slotWidth}
            height={145}
            rx={7}
            fill="none"
            stroke={isExtra ? accent : STOCK.line}
            opacity={isExtra ? extension : 1}
          />
        ) : null;
      })}
    </g>
  );
}
