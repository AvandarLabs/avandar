import { ramp, EASE } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { ClusterLedger } from "./ClusterLedger";
import { ClusterPoints } from "./ClusterPoints";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * The same supplied points contract into clusters and unfold without jitter.
 */
export function MapClusterUnfold({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const grouping =
    frame <= 99
      ? ramp(frame, 53, 29, EASE.inOut)
      : 1 - ramp(frame, 99, 40, EASE.inOut);
  return (
    <g opacity={ramp(frame, 0, 12)}>
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
      <rect
        x={48}
        y={140}
        width={480}
        height={360}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <ClusterPoints {...{ input, frame, grouping, accent }} />
      <ClusterLedger {...{ input, grouping, accent }} />
    </g>
  );
}
