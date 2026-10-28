import { propEq } from "@avandar/utils";
import type { Input } from "./ShelterUsableAreaCapacity.schema";

function _hundredths(value: number): number {
  const [whole, fraction = ""] = String(value).split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
/** Data for getCapacityFromFloorTiles. */
type GetCapacityFromFloorTilesResult = {
  gross: number;
  usable: number;
  equivalents: number;
  shortfall: number;
  spare: number;
  sleeping: Array<{
    id: string;
    column: number;
    row: number;
    role: "storage" | "closed" | "sleeping" | "circulation";
  }>;
  roleAreas: { [k: string]: number };
};

/** Exact hundredth arithmetic floors the area quotient only once. */
export function getCapacityFromFloorTiles(
  input: Readonly<Input>,
): GetCapacityFromFloorTilesResult {
  const sleeping = input.floorTiles.filter(propEq("role", "sleeping"));
  const tileHundredths = _hundredths(input.areaPerTile);
  const usableHundredths = sleeping.length * tileHundredths;
  const equivalents = Math.floor(
    usableHundredths / _hundredths(input.illustrativeAreaPerPlace),
  );
  return {
    gross: (input.floorTiles.length * tileHundredths) / 100,
    usable: usableHundredths / 100,
    equivalents,
    shortfall: Math.max(input.registeredPeople - equivalents, 0),
    spare: Math.max(equivalents - input.registeredPeople, 0),
    sleeping,
    roleAreas: Object.fromEntries(
      (["sleeping", "circulation", "storage", "closed"] as const).map(
        (role) => [
          role,
          (input.floorTiles.filter(propEq("role", role)).length *
            tileHundredths) /
            100,
        ],
      ),
    ),
  };
}
