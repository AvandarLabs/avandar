import { STOCK, type GraphicProps } from "../../graphics-common";
import { DEFAULT_INPUT } from "./CommunityCoordinationTable.fixtures";
import { CoordinationActors } from "./CoordinationActors";
import { CoordinationLabels } from "./CoordinationLabels";
import { CoordinationMarker } from "./CoordinationMarker";
import { CoordinationPlaceConnections } from "./CoordinationPlaceConnections";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * One authored reallocation responds to community input on a schematic table.
 */
export function CommunityCoordinationTable({
  input = DEFAULT_INPUT,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={330}
        y={135}
        width={300}
        height={355}
        rx={24}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <path
        d="M350 220 Q470 290 610 220 M350 390 Q470 330 610 390"
        fill="none"
        stroke={STOCK.line}
        strokeDasharray="5 8"
      />
      {input.places.map((place, index) => (
        <g key={place.id}>
          <circle
            cx={340 + place.x * 270}
            cy={160 + place.y * 280}
            r={25}
            fill="none"
            stroke={getCoordinationPlaceColorFromIndex({ index, accent })}
          />
          <path
            data-request-tag={place.id}
            d={`M${340 + place.x * 270 - 7} ${160 + place.y * 280 - 5} h${frame >= 108 ? 14 : 3} v10 h${frame >= 108 ? -14 : -3} Z`}
            fill={STOCK.surface}
            stroke={getCoordinationPlaceColorFromIndex({ index, accent })}
          />
        </g>
      ))}
      <CoordinationPlaceConnections input={input} accent={accent} />
      <CoordinationActors input={input} frame={frame} accent={accent} />
      {input.teams.map((team, index) => (
        <CoordinationMarker
          key={team.id}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
      <CoordinationLabels input={input} frame={frame} accent={accent} />
    </g>
  );
}
