import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  vehicle: "truck" | "cargo-bike";
  accent: string;
  phase: string;
  heading: number;
};
const VEHICLE_OUTLINES: { truck: number[][][]; "cargo-bike": number[][][] } = {
  truck: [
    [
      [-21, -15],
      [5, -15],
      [5, -10],
      [16, -10],
      [23, 0],
      [23, 9],
      [-21, 9],
      [-21, -15],
    ],
    [
      [7, -8],
      [14, -8],
      [19, 0],
      [7, 0],
      [7, -8],
    ],
  ],
  "cargo-bike": [
    [
      [-18, 8],
      [-6, -8],
      [8, 8],
      [-18, 8],
    ],
    [
      [-6, -8],
      [14, -8],
      [21, 8],
    ],
    [
      [12, -13],
      [19, -13],
    ],
    [
      [-9, -12],
      [-2, -12],
    ],
    [
      [-23, -17],
      [-10, -17],
      [-10, -4],
      [-23, -4],
      [-23, -17],
    ],
  ],
};
function _getRotatedPoint({
  x,
  y,
  heading,
}: Readonly<{ x: number; y: number; heading: number }>) {
  return {
    x: x * Math.cos(heading) - y * Math.sin(heading),
    y: x * Math.sin(heading) + y * Math.cos(heading),
  };
}
function _buildBodyPath({
  vehicle,
  heading,
}: Readonly<Pick<Props, "vehicle" | "heading">>) {
  const outlines = VEHICLE_OUTLINES[vehicle];
  return outlines
    .map((points) =>
      points
        .map(([x, y], index) => {
          const point = _getRotatedPoint({ x, y, heading });
          return `${index ? "L" : "M"}${point.x} ${point.y}`;
        })
        .join(" "),
    )
    .join(" ");
}
/** Delivery silhouette turns with the supplied safe journey. */
export function ConvoyVehicle({
  x,
  y,
  vehicle,
  accent,
  phase,
  heading,
}: Readonly<Props>): ReactNode {
  return (
    <g
      data-vehicle={vehicle}
      data-phase={phase}
      transform={`translate(${x} ${y})`}
    >
      <path
        d={_buildBodyPath({ vehicle, heading })}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      {[-14, 16].map((wheel) => {
        const center = _getRotatedPoint({ x: wheel, y: 10, heading });
        return (
          <circle
            key={wheel}
            cx={center.x}
            cy={center.y}
            r={6}
            fill={STOCK.ground}
            stroke={accent}
            strokeWidth={2}
          />
        );
      })}
    </g>
  );
}
