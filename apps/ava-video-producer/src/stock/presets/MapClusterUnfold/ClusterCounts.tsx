import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/** Each supplied anchor owns its derived membership subtotal. */
export function ClusterCounts({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.clusters.map((cluster, index) => {
        const numMembers = input.points.filter(
          propEq("clusterId", cluster.id),
        ).length;
        return (
          <g key={cluster.id} data-cluster={cluster.id} data-count={numMembers}>
            <LabelSlots
              labels={[
                [
                  `${index + 1} · ${cluster.label}`,
                  48 + index * 162,
                  528,
                  150,
                  12,
                  3,
                ],
                [String(numMembers), 48 + index * 162, 582, 150, 12, 1],
              ]}
            />
            <path
              d={`M${48 + index * 162} 590 h${numMembers * 12}`}
              stroke={accent}
            />
          </g>
        );
      })}
    </g>
  );
}
