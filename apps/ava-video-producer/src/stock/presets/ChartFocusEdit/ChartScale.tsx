import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { axisMaximum: number; refinement: number };
/** Grid refinement retains a common zero baseline and both scale endpoints. */
export function ChartScale({
  axisMaximum,
  refinement,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <g data-minor-grid="plot" opacity={mix(refinement, 0.5, 0.06)}>
        {[1, 2, 3, 4].map((index) => (
          <line
            key={index}
            x1={344 + index * 80}
            x2={344 + index * 80}
            y1={146}
            y2={524}
            stroke={STOCK.line}
          />
        ))}
      </g>
      <path
        data-zero-baseline="fixed"
        d="M344 146V534H744V146"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={1}
      />
      {[
        { value: 0, x: 344 },
        { value: axisMaximum, x: 744 },
      ].map(({ value, x }, index) => (
        <text
          key={index}
          x={x}
          y={555}
          fill={STOCK.muted}
          fontSize={14}
          fontFamily="Arial, sans-serif"
          textAnchor={index ? "end" : "start"}
        >
          {value}
        </text>
      ))}
    </g>
  );
}
