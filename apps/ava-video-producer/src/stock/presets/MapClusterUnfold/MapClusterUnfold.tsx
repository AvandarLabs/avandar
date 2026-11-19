import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ClusterLedger } from "./ClusterLedger";
import { ClusterPoints } from "./ClusterPoints";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

const SCENE_FADE_AT = 0;
const CLUSTER_AT = 53;
const CLUSTER_FRAMES = 29;
const UNFOLD_AT = 99;
const UNFOLD_FRAMES = 40;
/**
 * The same supplied points contract into clusters and unfold without jitter.
 */
export function MapClusterUnfold({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const grouping =
    frame <= UNFOLD_AT
      ? motion.ramp(
          frame,
          CLUSTER_AT,
          motion.scale(CLUSTER_FRAMES),
          motion.travel.easing,
        )
      : 1 -
        motion.ramp(
          frame,
          UNFOLD_AT,
          motion.scale(UNFOLD_FRAMES),
          motion.travel.easing,
        );
  return (
    <g opacity={motion.reveal(frame, SCENE_FADE_AT)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.before, 48, 58, 440, 14, 3],
          [input.copy.after, 600, 58, 312, 14, 3],
          [
            grouping > 0 ? input.labels.clusters : input.labels.points,
            48,
            116,
            480,
            14,
            2,
          ],
        ]}
      />
      <StockRect
        x={48}
        y={140}
        width={480}
        height={360}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <ClusterPoints {...{ input, frame, grouping, accent }} />
      <ClusterLedger {...{ input, grouping, accent }} />
    </g>
  );
}
