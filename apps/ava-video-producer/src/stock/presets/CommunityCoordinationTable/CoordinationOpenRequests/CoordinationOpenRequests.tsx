import { propEq } from "@avandar/utils";
import { OpenRequestCaption } from "./OpenRequestCaption";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** Each remaining request has its own keyed open label, including empty IDs. */
export function CoordinationOpenRequests({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const open = input.places.flatMap((place, index) => {
    return input.teams.some(propEq("agreedPlaceId", place.id))
      ? []
      : [{ place, index }];
  });
  return (
    <g>
      {open.map(({ place, index }, ordinal) => {
        return (
          <OpenRequestCaption
            key={place.id}
            placeId={place.id}
            index={index}
            x={25 + ordinal * 460}
            label={input.planLabels.unassigned}
            accent={accent}
          />
        );
      })}
    </g>
  );
}
