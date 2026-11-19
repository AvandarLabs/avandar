import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SketchedShape } from "../SketchedShape";
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
  /** Defaults to the theme's positive colour. */
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
  color,
  showMarker = true,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const ink = color ?? tokens.color.positive;
  _validateRouteStage([x, y, width, height]);
  const marker = getRoutePointFromProgress({ points, progress });
  const path = points
    .map((point, index) => {
      return `${index ? "L" : "M"}${x + point.x * width} ${y + point.y * height}`;
    })
    .join(" ");
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={ink}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showMarker ? (
        <circle
          cx={x + marker.x * width}
          cy={y + marker.y * height}
          r={5}
          fill={ink}
        />
      ) : null}
    </g>
  );
}
