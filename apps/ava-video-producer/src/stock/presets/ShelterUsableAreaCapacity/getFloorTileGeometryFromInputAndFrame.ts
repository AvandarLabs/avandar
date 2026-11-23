import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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

type UnrollOptions = {
  input: Readonly<{
    input: Input;
    tile: Input["floorTiles"][number];
    frame: number;
    motion: VideoMotion;
  }>["input"];
  tile: Readonly<{
    input: Input;
    tile: Input["floorTiles"][number];
    frame: number;
    motion: VideoMotion;
  }>["tile"];
  frame: Readonly<{
    input: Input;
    tile: Input["floorTiles"][number];
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    tile: Input["floorTiles"][number];
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type UnrollResult = {
  unroll: number;
  isSleeping: boolean;
  rank: number;
  lift: number;
};

type GetFloorTileGeometryFromInputAndFrameYOptions = {
  tile: Readonly<{
    input: Input;
    tile: Input["floorTiles"][number];
    frame: number;
    motion: VideoMotion;
  }>["tile"];
  unroll: UnrollResult["unroll"];
  isSleeping: UnrollResult["isSleeping"];
  lift: UnrollResult["lift"];
};

type GetFloorTileGeometryFromInputAndFrameWidthOptions = {
  input: Readonly<{
    input: Input;
    tile: Input["floorTiles"][number];
    frame: number;
    motion: VideoMotion;
  }>["input"];
  unroll: UnrollResult["unroll"];
  isSleeping: UnrollResult["isSleeping"];
};

type GetFloorTileGeometryFromInputAndFrameHeightOptions = {
  unroll: UnrollResult["unroll"];
  isSleeping: UnrollResult["isSleeping"];
};

/**
 * Samples the floor tile geometry from input and frame height for the current
 * authored frame.
 */
function _getFloorTileGeometryFromInputAndFrameHeight({
  unroll,
  isSleeping,
}: Readonly<GetFloorTileGeometryFromInputAndFrameHeightOptions>): number {
  return isSleeping
    ? Motion.mix({
        t: unroll,
        from: 62,
        to: 24,
      })
    : 62;
}

/**
 * Samples the floor tile geometry from input and frame width for the current
 * authored frame.
 */
function _getFloorTileGeometryFromInputAndFrameWidth({
  input,
  unroll,
  isSleeping,
}: Readonly<GetFloorTileGeometryFromInputAndFrameWidthOptions>): number {
  return isSleeping
    ? Motion.mix({
        t: unroll,
        from: 82,
        to: 360 / input.floorTiles.length,
      })
    : 82;
}

/**
 * Samples the floor tile geometry from input and frame y for the current
 * authored frame.
 */
function _getFloorTileGeometryFromInputAndFrameY({
  tile,
  unroll,
  isSleeping,
  lift,
}: Readonly<GetFloorTileGeometryFromInputAndFrameYOptions>): number {
  return isSleeping
    ? Motion.mix({
        t: unroll,
        from: 145 + tile.row * 62,
        to: 390,
      })
    : 145 + tile.row * 62 - lift;
}

/**
 * Samples the floor tile geometry from input and frame unroll state for the
 * current authored frame.
 */
function _getFloorTileGeometryFromInputAndFrameUnrollState({
  input,
  tile,
  frame,
  motion,
}: Readonly<UnrollOptions>): UnrollResult {
  const unroll = motion.ramp(
    frame,
    72,
    motion.scale(36),
    motion.entrance.easing,
  );
  const isSleeping = tile.role === "sleeping";
  const rank = input.floorTiles
    .filter(propEq("role", "sleeping"))
    .findIndex(propEq("id", tile.id));
  const lift = isSleeping
    ? 0
    : 24 * motion.ramp(frame, 36, motion.scale(36), motion.entrance.easing);
  return { unroll, isSleeping, rank, lift };
}

/** Sleeping tiles alone move into a continuous strip of exact usable area. */
export function getFloorTileGeometryFromInputAndFrame({
  input,
  tile,
  frame,
  motion,
}: Readonly<{
  input: Input;
  tile: Input["floorTiles"][number];
  frame: number;
  motion: VideoMotion;
}>): GetFloorTileGeometryResult {
  const { unroll, isSleeping, rank, lift } =
    _getFloorTileGeometryFromInputAndFrameUnrollState({
      input,
      tile,
      frame,
      motion,
    });
  return {
    isSleeping,
    lift,
    x: isSleeping
      ? Motion.mix({
          t: unroll,
          from: 60 + tile.column * 82,
          to: 60 + (rank * 360) / input.floorTiles.length,
        })
      : 60 + tile.column * 82,
    y: _getFloorTileGeometryFromInputAndFrameY({
      tile,
      unroll,
      isSleeping,
      lift,
    }),
    width: _getFloorTileGeometryFromInputAndFrameWidth({
      input,
      unroll,
      isSleeping,
    }),
    height: _getFloorTileGeometryFromInputAndFrameHeight({
      unroll,
      isSleeping,
    }),
  };
}
