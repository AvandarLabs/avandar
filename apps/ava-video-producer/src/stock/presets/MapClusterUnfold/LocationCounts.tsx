import { propEq, prop } from "@avandar/utils";
import { STOCK } from "../../stockPalette";
import { getClusterPointPositionFromPoint } from "./getClusterPointPositionFromPoint";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";
type Props = { input: Input; grouping: number; accent: string };
function _getLocations({ input, grouping }: Readonly<Omit<Props, "accent">>) {
  const positions = input.points.map((point) => {
    const cluster = input.clusters.find(propEq("id", point.clusterId))!;
    return getClusterPointPositionFromPoint({ point, cluster, grouping });
  });
  return positions
    .filter(
      (position, index) =>
        positions.findIndex(
          (other) => other.x === position.x && other.y === position.y,
        ) === index,
    )
    .map((position) => {
      const members = positions.filter(
        (other) => other.x === position.x && other.y === position.y,
      );
      return {
        x: position.x,
        y: position.y,
        numMembers: members.length,
        hasStationaryMember: members.some(prop("isStationary")),
      };
    });
}
/** Stable groups and stationary coincident members retain derived badges. */
export function LocationCounts({
  input,
  grouping,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {_getLocations({ input, grouping })
        .filter(
          (location) =>
            grouping === 0 ||
            grouping === 1 ||
            (location.hasStationaryMember && location.numMembers > 1),
        )
        .map((location, index) => (
          <g key={index} data-location-count={location.numMembers}>
            <circle
              cx={location.x}
              cy={location.y}
              r={14}
              fill={STOCK.elevated}
              stroke={accent}
            />
            <text
              x={location.x}
              y={location.y + 4}
              textAnchor="middle"
              fontSize={12}
              fill={STOCK.text}
            >
              {location.numMembers}
            </text>
          </g>
        ))}
    </g>
  );
}
