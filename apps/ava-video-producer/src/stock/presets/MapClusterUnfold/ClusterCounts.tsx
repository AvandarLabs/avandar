import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
const BAR_LENGTH_PER_MEMBER = 12;
/** Each supplied anchor owns its derived membership subtotal. */
export function ClusterCounts({ input, accent }: Readonly<Props>): ReactNode {
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {input.clusters.map((cluster, index) => {
        const numMembers = input.points.filter(
          propEq("clusterId", cluster.id),
        ).length;
        return (
          <g key={cluster.id} data-cluster={cluster.id} data-count={numMembers}>
            <LabelSlots
              labels={[
                [
                  `${index + 1} · ${cluster.label}`,
                  48 + index * 162,
                  528,
                  150,
                  12,
                  3,
                ],
                [String(numMembers), 48 + index * 162, 582, 150, 12, 1],
              ]}
            />
            <SketchedShape
              shape={{
                kind: "path",
                d: `M${48 + index * 162} 590 h${numMembers * BAR_LENGTH_PER_MEMBER}`,
              }}
              profile={sketch.shape}
              stroke={accent}
              strokeWidth={shapes.stroke(stroke.hairline)}
            />
          </g>
        );
      })}
    </g>
  );
}
