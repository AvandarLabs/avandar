import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/videoThemeHelpers";
import type { Point } from "../../../layout/SceneGeometry";
import type { GraphEdge } from "../../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scales: ReturnType<typeof useVideoShapeScales>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  edge: GraphEdge;
  fontSizes: ReturnType<typeof useVideoTheme>["mantine"]["fontSizes"];
  start: Point;
  end: Point;
  labelWidth: number;
};
/** Renders graph edge label. */
export function GraphEdgeLabel({
  tokens,
  scales,
  scene,
  edge,
  fontSizes,
  start,
  end,
  labelWidth,
}: Readonly<Props>): ReactNode {
  return (
    <g
      transform={`translate(${(start.x + end.x) / 2}, ${(start.y + end.y) / 2})`}
    >
      <rect
        x={-labelWidth / 2}
        y={-17}
        width={labelWidth}
        height={34}
        rx={scales.corner(tokens.corner.cell)}
        fill={scene.ground}
      />
      <text
        fill={scene.mutedForeground}
        fontSize={fontSizes.xl}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {edge.label}
      </text>
    </g>
  );
}
