import { propEq } from "@avandar/utils";
import { STOCK } from "../../stockPalette";
import { DistrictFootprint } from "./DistrictFootprint";
import { getAssignmentsFromLocations } from "./getAssignmentsFromLocations";
import { UncertainLocation } from "./UncertainLocation";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Nominal locations stay fixed while their complete supplied disks expand. */
export function UncertaintyMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const focus = getAssignmentsFromLocations(input).find(
    propEq("id", input.focusedLocationId),
  )!;
  return (
    <g>
      <rect
        x={50}
        y={140}
        width={360}
        height={360}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      {input.districts.map((district, index) => (
        <DistrictFootprint
          key={district.id}
          district={district}
          index={index}
          frame={frame}
          isPossible={focus.possible.includes(index)}
          accent={accent}
        />
      ))}
      {input.locations.map((location, index) => (
        <UncertainLocation
          key={location.id}
          location={location}
          index={index}
          isFocused={location.id === input.focusedLocationId}
          showFootprint={
            location.id === input.focusedLocationId || input.showOtherFootprints
          }
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
