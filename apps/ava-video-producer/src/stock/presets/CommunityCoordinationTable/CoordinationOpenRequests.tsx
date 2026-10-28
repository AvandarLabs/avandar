import { propEq } from "@avandar/utils";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getCoordinationPlaceColorFromIndex } from "./getCoordinationPlaceColorFromIndex";
import type { Input } from "./CommunityCoordinationTable.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/** Each remaining request has its own keyed open label, including empty IDs. */
export function CoordinationOpenRequests({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const open = input.places.flatMap((place, index) =>
    input.teams.some(propEq("agreedPlaceId", place.id))
      ? []
      : [{ place, index }],
  );
  return (
    <g>
      {open.map(({ place, index }, ordinal) => {
        const x = 25 + ordinal * 460,
          color = getCoordinationPlaceColorFromIndex({ index, accent });
        return (
          <g key={place.id} data-unassigned-caption={place.id}>
            <circle cx={x} cy={82} r={9} fill={STOCK.surface} stroke={color} />
            <text
              data-open-place-key
              x={x}
              y={86}
              textAnchor="middle"
              fontSize={12}
              fill={color}
            >
              {String.fromCharCode(65 + index)}
            </text>
            <FitText
              text={input.planLabels.unassigned}
              x={x + 20}
              y={86}
              width={405}
              fontSize={12}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </g>
  );
}
