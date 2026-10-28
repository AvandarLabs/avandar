import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./GeometryDetailBudget.schema";
import type { ReactNode } from "react";

type Props = { labels: Input["labels"]; accent: string };
/** Paired line samples identify the two styles overlaid in the source plane. */
export function TraceLegend({ labels, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {[labels.original, labels.simplified].map((label, index) => {
        const x = index ? 480 : 40;
        return (
          <g
            key={index ? "simplified" : "original"}
            data-trace-legend={index ? "simplified" : "original"}
          >
            <path
              data-trace-sample={index ? "simplified" : "original"}
              data-sample-right={x + 46}
              data-sample-top={130}
              d={
                index
                  ? `M${x} 142 L${x + 23} 132 L${x + 46} 142`
                  : `M${x} 142 L${x + 8} 134 L${x + 15} 145 L${x + 23} 132 L${x + 32} 143 L${x + 39} 136 L${x + 46} 142`
              }
              fill="none"
              stroke={index ? accent : STOCK.muted}
              strokeWidth={index ? 3 : 2}
            />
            <LabelSlots
              labels={[[label, x + 60, 142, index ? 380 : 340, 12, 2]]}
            />
          </g>
        );
      })}
    </g>
  );
}
