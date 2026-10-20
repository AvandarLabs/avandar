import { STOCK } from "../../graphics-common";
import {
  type RouteTravel,
  getRoutePointFromProgress,
} from "./getRoutePointFromProgress";
import type { ReactNode } from "react";
/** Data for Props. */
type PropsResult = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  showMarker?: boolean;
};

type Props = RouteTravel & PropsResult;

function _validateRouteStage([x, y, width, height]: readonly [
  number,
  number,
  number,
  number,
]): void {
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Route stage dimensions must be positive and finite.");
  }
}

/** Draws the supplied polyline and an optional arc-length travel marker. */
export function RoutePath({
  points,
  progress,
  x = 0,
  y = 0,
  width = 1,
  height = 1,
  color = STOCK.mint,
  showMarker = true,
}: Readonly<Props>): ReactNode {
  _validateRouteStage([x, y, width, height]);
  const marker = getRoutePointFromProgress({ points, progress });
  const path = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x + point.x * width} ${y + point.y * height}`,
    )
    .join(" ");
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showMarker ? (
        <circle
          cx={x + marker.x * width}
          cy={y + marker.y * height}
          r={5}
          fill={color}
        />
      ) : null}
    </g>
  );
}
