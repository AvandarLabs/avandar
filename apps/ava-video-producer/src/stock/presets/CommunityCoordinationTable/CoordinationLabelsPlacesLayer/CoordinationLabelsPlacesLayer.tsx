import { CoordinationPlaceCopy } from "../CoordinationPlaceCopy";
import type { Input } from "../CommunityCoordinationTable.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

/** Renders the places layer with authored geometry. */
export function CoordinationLabelsPlacesLayer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.places.map((place, index) => {
        return (
          <CoordinationPlaceCopy
            key={place.id}
            {...{ place, index, frame, accent }}
          />
        );
      })}
    </>
  );
}
