import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ClusterCounts } from "./ClusterCounts";
import { PointRoster } from "./PointRoster";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = { input: Input; grouping: number; accent: string };
/**
 * A keyed roster distinguishes coincident identities and overlapping anchors.
 */
export function ClusterLedger({
  input,
  grouping,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <PointRoster input={input} />
      <ClusterCounts {...{ input, accent }} />
      <g data-total={input.points.length}>
        <LabelSlots
          labels={[
            [
              `${input.labels.total}: ${input.points.length}`,
              600,
              536,
              312,
              14,
              3,
            ],
          ]}
        />
      </g>
      <g data-grouping={grouping} />
    </g>
  );
}
