import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getClusterPointPositionFromPoint } from "../getClusterPointPositionFromPoint";
import { LocationCounts } from "../LocationCounts/LocationCounts";
import { ClusterPoint } from "./ClusterPoint";
import type { Input } from "../MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  grouping: number;
  accent: string;
};
const POINTS_AT = 13;
const POINTS_FRAMES = 39;
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
  const motion = GraphicThemeHooks.useGraphicMotion();
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
          <ClusterPoint
            key={point.id}
            point={point}
            index={index}
            x={x}
            y={y}
            accent={accent}
          />
        );
      })}
      <LocationCounts {...{ input, grouping, accent }} />
    </g>
  );
}
