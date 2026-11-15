import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { text: string; y: number };
/**
 * The missing key uses the same muted fill and dashed stroke as a null tile.
 */
export function MissingClassKey({ text, y }: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        data-missing-class-key="true"
        x={554}
        y={y - 11}
        width={14}
        height={14}
        fill={STOCK.muted}
        fillOpacity={0.15}
        stroke={STOCK.muted}
        strokeDasharray="4 5"
      />
      <LabelSlots labels={[[text, 578, y, 322, 12, 2]]} />
    </g>
  );
}
