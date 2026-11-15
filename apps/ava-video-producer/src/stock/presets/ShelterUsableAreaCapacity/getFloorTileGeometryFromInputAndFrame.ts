import { propEq } from "@avandar/utils";
import { ramp, mix } from "../../../motion";
import type { Input } from "./ShelterUsableAreaCapacity.schema";
/** Data for getFloorTileGeometryFromInputAndFrame. */
type GetFloorTileGeometryResult = {
  isSleeping: boolean;
  lift: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Sleeping tiles alone move into a continuous strip of exact usable area. */
export function getFloorTileGeometryFromInputAndFrame({
  input,
  tile,
  frame,
}: Readonly<{
  input: Input;
  tile: Input["floorTiles"][number];
  frame: number;
}>): GetFloorTileGeometryResult {
  const unroll = ramp(frame, 72, 36);
  const isSleeping = tile.role === "sleeping";
  const rank = input.floorTiles
    .filter(propEq("role", "sleeping"))
    .findIndex(propEq("id", tile.id));
  const lift = isSleeping ? 0 : 24 * ramp(frame, 36, 36);
  return {
    isSleeping,
    lift,
    x: isSleeping
      ? mix(
          unroll,
          60 + tile.column * 82,
          60 + (rank * 360) / input.floorTiles.length,
        )
      : 60 + tile.column * 82,
    y: isSleeping
      ? mix(unroll, 145 + tile.row * 62, 390)
      : 145 + tile.row * 62 - lift,
    width: isSleeping ? mix(unroll, 82, 360 / input.floorTiles.length) : 82,
    height: isSleeping ? mix(unroll, 62, 24) : 62,
  };
}
