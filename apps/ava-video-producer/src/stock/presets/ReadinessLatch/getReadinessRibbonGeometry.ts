import { mix } from "../../../motion";

type Rectangle = { x: number; y: number; width: number; height: number };

type ReadinessRibbonGeometry = {
  track: Rectangle;
  ribbon: Rectangle;
  pin: { x1: number; x2: number; y1: number; y2: number };
};

/** Track, growing ribbon and withdrawing pin share the same orientation. */
export function getReadinessRibbonGeometry({
  horizontal,
  x,
  y,
  progress,
  withdrawal,
}: Readonly<{
  horizontal: boolean;
  x: number;
  y: number;
  progress: number;
  withdrawal: number;
}>): ReadinessRibbonGeometry {
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
  const pin = {
    x1: horizontal ? mix(withdrawal, 640, 692) : x - 18,
    x2: horizontal ? mix(withdrawal, 662, 714) : x + 26,
    y1: horizontal ? y + 4 : mix(withdrawal, 400, 350),
    y2: horizontal ? y + 4 : mix(withdrawal, 400, 350),
  };
  return { track, ribbon, pin };
}
