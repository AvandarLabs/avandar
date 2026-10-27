import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  module: { id: string; label: string };
  x: number;
  y: number;
  isReplacement?: boolean;
  isRemoved?: boolean;
  accent: string;
};
/**
 * A complete module keeps its original identity and readable label in transit.
 */
export function ServiceModule({
  module,
  x,
  y,
  isReplacement = false,
  isRemoved = false,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-module={isReplacement ? undefined : module.id}
        data-replacement={isReplacement ? module.id : undefined}
        data-removed-original={isRemoved ? module.id : undefined}
        x={x}
        y={y}
        width={136}
        height={128}
        rx={6}
        fill={STOCK.surface}
        stroke={isReplacement ? accent : STOCK.line}
        strokeWidth={2}
      />
      <LabelSlots labels={[[module.label, x + 10, y + 24, 116, 14, 5]]} />
      <path
        d={`M${x + 60} ${y} v-8 h16 v8`}
        fill="none"
        stroke={STOCK.cyan}
        strokeWidth={3}
      />
    </g>
  );
}
