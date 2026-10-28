import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getClusterPointPositionFromPoint } from "./getClusterPointPositionFromPoint";
import { LocationCounts } from "./LocationCounts";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; grouping: number; accent: string };
/**
 * Every identity follows its own authored source and referenced cluster
 * center.
 */
export function ClusterPoints({
  input,
  frame,
  grouping,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 13, 39)}>
      {input.points.map((point, index) => {
        const cluster = input.clusters.find(propEq("id", point.clusterId))!;
        const { x, y } = getClusterPointPositionFromPoint({
          point,
          cluster,
          grouping,
        });
        return (
          <g key={point.id}>
            <path
              data-point-leader={point.id}
              d={`M${x} ${y} L584 ${149 + index * 44}`}
              fill="none"
              stroke={STOCK.muted}
              strokeOpacity={0.25}
            />
            <circle
              data-point={point.id}
              data-cluster-id={point.clusterId}
              cx={x}
              cy={y}
              r={6}
              fill={accent}
              fillOpacity={0.5}
              stroke={STOCK.text}
            />
          </g>
        );
      })}
      <LocationCounts {...{ input, grouping, accent }} />
    </g>
  );
}
