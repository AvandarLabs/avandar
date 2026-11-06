import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** One ruler and color legend belong equally to both independent periods. */
export function RevenueLegend({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <path
        data-common-ruler="true"
        d="M80 463 V450 H420 V463 M250 450 V458"
        stroke={STOCK.muted}
        fill="none"
      />
      <text x={80} y={480} fill={STOCK.muted} fontSize={12}>
        0
      </text>
      <text x={420} y={480} textAnchor="end" fill={STOCK.muted} fontSize={12}>
        {input.periods[0].receiptsMinor / input.money.minorUnitsPerUnit}
      </text>
      {[input.copy.operating, input.copy.distribution, input.copy.retained].map(
        (label, index) => (
          <g key={index}>
            <rect
              x={60 + index * 290}
              y={500}
              width={12}
              height={12}
              fill={[STOCK.cyan, STOCK.orange, accent][index]}
            />
            <LabelSlots labels={[[label, 80 + index * 290, 511, 260, 12, 3]]} />
          </g>
        ),
      )}
    </g>
  );
}
