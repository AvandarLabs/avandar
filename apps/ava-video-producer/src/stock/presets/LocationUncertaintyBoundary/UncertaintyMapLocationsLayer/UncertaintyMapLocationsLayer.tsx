import { UncertainLocation } from "../UncertainLocation";
import type { Input } from "../LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

/** Renders the locations layer with authored geometry. */
export function UncertaintyMapLocationsLayer({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.locations.map((location, index) => {
        return (
          <UncertainLocation
            key={location.id}
            location={location}
            index={index}
            isFocused={location.id === input.focusedLocationId}
            showFootprint={
              location.id === input.focusedLocationId ||
              input.showOtherFootprints
            }
            frame={frame}
            accent={accent}
          />
        );
      })}
    </>
  );
}
