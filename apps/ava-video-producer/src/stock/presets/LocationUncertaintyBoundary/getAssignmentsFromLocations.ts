import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import type { Input } from "./LocationUncertaintyBoundary.schema";
/** Data for getAssignmentsFromLocations. */
type GetAssignmentsFromLocationsResult = {
  district: number;
  possible: number[];
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
};

/** Classify every entire uncertainty footprint independently of visibility. */
export function getAssignmentsFromLocations(
  input: Readonly<Input>,
): GetAssignmentsFromLocationsResult[] {
  return input.locations.map((location) => {
    const states = input.districts.map((district) =>
      PlanarPolygon.getDiskClassification({
        center: [location.x, location.y],
        radius: location.radius,
        polygon: district.polygon,
      }),
    );
    return {
      ...location,
      district: states.findIndex((state) => state === "inside"),
      possible: states.flatMap((state, index) =>
        state !== "outside" ? [index] : [],
      ),
    };
  });
}
