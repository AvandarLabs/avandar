import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Each keyed source identity remains listed through coincident grouping. */
export function PointRoster({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.points.map((point, index) => (
        <g key={point.id} data-roster-point={point.id}>
          <LabelSlots
            labels={[
              [
                `${index + 1} · ${point.label} → ${input.clusters.findIndex(propEq("id", point.clusterId)) + 1}`,
                600,
                153 + index * 44,
                312,
                12,
                2,
              ],
            ]}
          />
          {input.showMemberIds ? (
            <LiteralDataText value={point.id} x={600} y={179 + index * 44} />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
