import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { groups: string[]; progress: number };
/** Exact second-dimension values label the temporary subgroup compartments. */
export function DrillSubgroupCompartments({
  groups,
  progress,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {progress < 1
        ? groups.map((group, index) => (
            <g key={group} opacity={1 - progress}>
              <rect
                x={44 + index * 292}
                y={294}
                width={284}
                height={266}
                fill="none"
                stroke={STOCK.line}
              />
              <LiteralDataText value={group} x={56 + index * 292} y={310} />
            </g>
          ))
        : undefined}
    </g>
  );
}
