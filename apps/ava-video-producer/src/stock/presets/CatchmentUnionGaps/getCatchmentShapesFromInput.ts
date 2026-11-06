import type { Input } from "./CatchmentUnionGaps.schema";
/** Data for getCatchmentShapesFromInput. */
type GetCatchmentShapesResult = {
  points: string;
  id: string;
  label: string;
  polygon: Array<[number, number]>;
};

/** Fixed projected footprints preserve the input ring order. */
export function getCatchmentShapesFromInput(
  input: Readonly<Input>,
): GetCatchmentShapesResult[] {
  return input.catchments.map((catchment) => ({
    ...catchment,
    points: catchment.polygon
      .map(([x, y]) => `${70 + x * 4.8},${160 + y * 2.8}`)
      .join(" "),
  }));
}
