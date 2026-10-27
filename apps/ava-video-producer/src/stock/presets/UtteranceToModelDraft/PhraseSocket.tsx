import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { role: string; label: string; accent: string };
/** The settled model has separate role and authored-label bands. */
export function PhraseSocket({
  role,
  label,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        width={254}
        height={96}
        rx={8}
        fill={STOCK.surface}
        stroke={accent}
      />
      <LabelSlots
        labels={[
          [role, 12, 19, 230, 12, 2],
          [label, 12, 53, 230, 14, 3],
        ]}
      />
    </g>
  );
}
