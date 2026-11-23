import { Motion } from "../../../motion";
import { getRoutePointFromProgress } from "../../primitives/RoutePath/getRoutePointFromProgress";
import { getClosedInteriorEncounterFromSegments } from "./getClosedInteriorEncounterFromSegments";
import { getConvoyRouteFromRole } from "./getConvoyRouteFromRole";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ConvoyRouteDetour.schema";

/** Inputs for getPoint. */
type GetPointArguments = {
  points: readonly Point[];
  progress: number;
};

/** Inputs for getHeading. */
type GetHeadingArguments = {
  points: readonly Point[];
  progress: number;
};

/** Inputs for getConvoyJourneyFromInputAndFrame. */
type ConvoyJourneyOptions = {
  frame: number;
  input: Input;
  motion: VideoMotion;
};

type Point = {
  x: number;
  y: number;
};

type DetourOptions = {
  frame: Readonly<ConvoyJourneyOptions>["frame"];
  input: Readonly<ConvoyJourneyOptions>["input"];
  motion: Readonly<ConvoyJourneyOptions>["motion"];
};

type DetourResult = {
  detour: ReturnType<typeof getConvoyRouteFromRole>["points"];
  point: Point;
  incomingHeading: number;
  detourHeading: number;
  turn: number;
};

/** Data for getConvoyJourneyFromInputAndFrame. */
type GetConvoyJourneyResult = {
  heading: number;
  x: number;
  y: number;
  phase: string;
};

type GetJourneyPointFromFrameOptions = {
  frame: number;
  motion: VideoMotion;
  prefix: readonly Point[];
  returning: readonly Point[];
  detour: readonly Point[];
};

function _getSafePrefix(input: Readonly<Input>): Point[] {
  // ConvoyRouteDetour.schema requires exactly one blocked route.
  const points = getConvoyRouteFromRole({ input, role: "blocked" }).points;
  const start = points[input.obstruction.segmentIndex];
  const end = points[input.obstruction.segmentIndex + 1];
  const encounters = points
    .slice(1, input.obstruction.segmentIndex + 1)
    .map((to, index) => {
      return {
        to,
        from: points[index],
        encounter: getClosedInteriorEncounterFromSegments({
          from: points[index],
          to,
          start,
          end,
        }),
      };
    });
  const crossingIndex = encounters.findIndex(({ encounter }) => {
    return encounter !== undefined;
  });
  const stopIndex =
    crossingIndex === -1 ? encounters.length - 1 : crossingIndex;
  const { from, to, encounter } = encounters[stopIndex];
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const stop =
    length === 0
      ? 0
      : Math.max(0, (encounter ?? 1) - Math.min(0.08 / length, 0.35));
  return [
    ...points.slice(0, stopIndex + 1),
    {
      x: Motion.mix({ t: stop, from: from.x, to: to.x }),
      y: Motion.mix({ t: stop, from: from.y, to: to.y }),
    },
  ];
}

function _getPoint({ points, progress }: Readonly<GetPointArguments>): Point {
  if (
    points.every((point) => {
      return point.x === points[0].x && point.y === points[0].y;
    })
  ) {
    return { ...points[0] };
  }
  return getRoutePointFromProgress({ points, progress });
}

/** Samples the authored approach, return and detour without retained state. */
function _getJourneyPointFromFrame({
  frame,
  motion,
  prefix,
  returning,
  detour,
}: Readonly<GetJourneyPointFromFrameOptions>): Point {
  return frame < 60
    ? _getPoint({
        points: prefix,
        progress: motion.ramp(
          frame,
          22,
          motion.scale(28),
          motion.travel.easing,
        ),
      })
    : frame < 78
      ? _getPoint({
          points: returning,
          progress: motion.ramp(frame, 60, motion.hero, motion.travel.easing),
        })
      : _getPoint({
          points: detour.slice(1),
          progress: motion.ramp(
            frame,
            78,
            motion.scale(46),
            motion.travel.easing,
          ),
        });
}

function _getHeading({
  points,
  progress,
}: Readonly<GetHeadingArguments>): number {
  const before = _getPoint({ points, progress: Math.max(0, progress - 0.001) });
  const after = _getPoint({ points, progress: Math.min(1, progress + 0.001) });
  return Math.atan2((after.y - before.y) * 280, (after.x - before.x) * 800);
}

/**
 * Samples the convoy journey from input and frame detour state for the current
 * authored frame.
 */
function _getConvoyJourneyFromInputAndFrameDetourState({
  frame,
  input,
  motion,
}: Readonly<DetourOptions>): DetourResult {
  const blocked = getConvoyRouteFromRole({ input, role: "blocked" }).points;
  // ConvoyRouteDetour.schema requires exactly one detour route.
  const detour = getConvoyRouteFromRole({ input, role: "detour" }).points;
  const prefix = _getSafePrefix(input);
  // A first-edge stop is before the shared junction, so continue to it safely.
  const returning =
    prefix.length === 2
      ? [prefix.at(-1)!, blocked[1]]
      : [...prefix.slice(1)].reverse();
  const point = _getJourneyPointFromFrame({
    frame,
    motion,
    prefix,
    returning,
    detour,
  });
  const incomingHeading = _getHeading({
    points: frame < 60 ? prefix : returning,
    progress:
      frame < 60
        ? motion.ramp(frame, 22, motion.scale(28), motion.travel.easing)
        : motion.ramp(frame, 60, motion.hero, motion.travel.easing),
  });
  const detourHeading = _getHeading({
    points: detour.slice(1),
    progress: motion.ramp(frame, 78, motion.scale(46), motion.travel.easing),
  });
  const turn =
    ((detourHeading - incomingHeading + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return { detour, point, incomingHeading, detourHeading, turn };
}

/** Deterministic safe approach, braking hold, reversal and authored detour. */
export function getConvoyJourneyFromInputAndFrame({
  frame,
  input,
  motion,
}: Readonly<ConvoyJourneyOptions>): GetConvoyJourneyResult {
  // ConvoyRouteDetour.schema requires exactly one blocked route.
  const { detour, point, incomingHeading, detourHeading, turn } =
    _getConvoyJourneyFromInputAndFrameDetourState({ frame, input, motion });
  return {
    heading:
      frame >= 78
        ? detourHeading
        : incomingHeading +
          turn * motion.ramp(frame, 72, motion.chip, motion.travel.easing),
    x: 80 + point.x * 800,
    y: 180 + point.y * 280,
    phase: frame < 60 ? "approach" : frame < 78 ? "reverse" : "detour",
  };
}
