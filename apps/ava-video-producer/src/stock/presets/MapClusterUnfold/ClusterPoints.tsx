import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getClusterPointPositionFromPoint } from "./getClusterPointPositionFromPoint";
import { LocationCounts } from "./LocationCounts";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; grouping: number; accent: string };

const POINTS_AT = 13;
const POINTS_FRAMES = 39;
const POINT_FILL_ALPHA = 0.5;
/**
 * Every identity follows its own authored source and referenced cluster
 * center.
 */
export function ClusterPoints({
  input,
  frame,
  grouping,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke, alpha, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <g opacity={motion.ramp(frame, POINTS_AT, motion.scale(POINTS_FRAMES))}>
      {input.points.map((point, index) => {
        const cluster = input.clusters.find(propEq("id", point.clusterId))!;
        const { x, y } = getClusterPointPositionFromPoint({
          point,
          cluster,
          grouping,
        });
        return (
          <g key={point.id}>
            <SketchedShape
              data-point-leader={point.id}
              shape={{ kind: "path", d: `M${x} ${y} L584 ${149 + index * 44}` }}
              profile={sketch.shape}
              fill="none"
              stroke={color.inactive}
              strokeOpacity={alpha.ghost}
              strokeWidth={hairline}
            />
            <SketchedShape
              data-point={point.id}
              data-cluster-id={point.clusterId}
              shape={{ kind: "circle", cx: x, cy: y, r: 6 }}
              profile={sketch.shape}
              fill={accent}
              fillOpacity={POINT_FILL_ALPHA}
              stroke={color.text}
              strokeWidth={hairline}
            />
          </g>
        );
      })}
      <LocationCounts {...{ input, grouping, accent }} />
    </g>
  );
}
