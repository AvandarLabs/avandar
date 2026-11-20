import { propEq, prop } from "@avandar/utils";
import { getClusterPointPositionFromPoint } from "../../getClusterPointPositionFromPoint";
import { type Props } from "./LocationCountsShared.types";

function _getLocations({ input, grouping }: Readonly<Omit<Props, "accent">>) {
  const positions = input.points.map((point) => {
    const cluster = input.clusters.find(propEq("id", point.clusterId))!;
    return {
      ...getClusterPointPositionFromPoint({ point, cluster, grouping }),
      pointId: point.id,
    };
  });
  return positions
    .filter((position, index) => {
      return (
        positions.findIndex((other) => {
          return other.x === position.x && other.y === position.y;
        }) === index
      );
    })
    .map((position) => {
      const members = positions.filter((other) => {
        return other.x === position.x && other.y === position.y;
      });
      return {
        id: position.pointId,
        x: position.x,
        y: position.y,
        numMembers: members.length,
        hasStationaryMember: members.some(prop("isStationary")),
      };
    });
}
/** Aggregates animated point locations for cluster count badges. */
export const LocationCountsShared = {
  /** Groups coincident animated points with counts and stationary flags. */
  getLocations: _getLocations,
} as const;
