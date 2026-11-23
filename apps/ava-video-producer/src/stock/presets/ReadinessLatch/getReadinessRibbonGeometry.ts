import { Motion } from "../../../motion";

type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type LineSegment = { x1: number; x2: number; y1: number; y2: number };
type ReadinessRibbonOptions = {
  horizontal: boolean;
  x: number;
  y: number;
  progress: number;
  withdrawal: number;
};
type ReadinessRibbonGeometry = {
  track: Rectangle;
  ribbon: Rectangle;
  pin: LineSegment;
};
/** Track, growing ribbon and withdrawing pin share the same orientation. */
export function getReadinessRibbonGeometry({
  horizontal,
  x,
  y,
  progress,
  withdrawal,
}: Readonly<ReadinessRibbonOptions>): ReadinessRibbonGeometry {
  const track = {
    x,
    y,
    width: horizontal ? 350 : 8,
    height: horizontal ? 8 : 100,
  };
  const ribbon = {
    ...track,
    width: horizontal ? 350 * progress : 8,
    height: horizontal ? 8 : 100 * progress,
  };
  const pin = _getPinFromOptions({ horizontal, x, y, withdrawal });
  return { track, ribbon, pin };
}

function _getPinFromOptions({
  horizontal,
  x,
  y,
  withdrawal,
}: Readonly<
  Pick<ReadinessRibbonOptions, "horizontal" | "x" | "y" | "withdrawal">
>): LineSegment {
  return {
    x1: horizontal ? Motion.mix({ t: withdrawal, from: 640, to: 692 }) : x - 18,
    x2: horizontal ? Motion.mix({ t: withdrawal, from: 662, to: 714 }) : x + 26,
    y1: horizontal ? y + 4 : Motion.mix({ t: withdrawal, from: 400, to: 350 }),
    y2: horizontal ? y + 4 : Motion.mix({ t: withdrawal, from: 400, to: 350 }),
  };
}
