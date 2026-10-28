import { STOCK } from "../../stockPalette";
import { HistogramLabels } from "./HistogramLabels";
import { HistogramSegments } from "./HistogramSegments";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * The complete ordered histogram retains a distinct unknown-time compartment.
 */
export function CaseHistogram({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {Array.from({ length: input.timeBins.length + 1 }, (_, index) => (
        <g key={index}>
          <line
            x1={348 + index * 38}
            x2={382 + index * 38}
            y1={343}
            y2={343}
            stroke={STOCK.line}
          />
          <text
            x={365 + index * 38}
            y={361}
            textAnchor="middle"
            fill={STOCK.muted}
            fontSize={12}
          >
            {index === input.timeBins.length ? "?" : index + 1}
          </text>
        </g>
      ))}
      <HistogramSegments input={input} frame={frame} accent={accent} />
      <HistogramLabels input={input} />
    </g>
  );
}
