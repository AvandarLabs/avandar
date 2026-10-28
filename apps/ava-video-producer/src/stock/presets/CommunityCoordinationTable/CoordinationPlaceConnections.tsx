import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/**
 * Request connectors sit below physical tokens so their keys remain legible.
 */
export function CoordinationPlaceConnections({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.places.map((place, index) => (
        <path
          key={place.id}
          data-place-connector={place.id}
          d={`M322 ${120 + 108 * index} L330 ${120 + 108 * index} L${340 + place.x * 270} ${160 + place.y * 280}`}
          fill="none"
          stroke={getCoordinationPlaceColorFromIndex({ index, accent })}
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}
