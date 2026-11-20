import { LocationBadge } from "./LocationBadge";
import { LocationCountsShared } from "./LocationCountsShared/LocationCountsShared";
import { type Props } from "./LocationCountsShared/LocationCountsShared.types";
import type { ReactNode } from "react";
/** Stable groups and stationary coincident members retain derived badges. */
export function LocationCounts({
  input,
  grouping,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {LocationCountsShared.getLocations({ input, grouping })
        .filter((location) => {
          return (
            grouping === 0 ||
            grouping === 1 ||
            (location.hasStationaryMember && location.numMembers > 1)
          );
        })
        .map((location, index) => {
          return (
            <LocationBadge key={index} location={location} accent={accent} />
          );
        })}
    </g>
  );
}
