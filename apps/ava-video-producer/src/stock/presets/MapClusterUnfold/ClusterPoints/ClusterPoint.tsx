import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../MapClusterUnfold.schema";
import type { ReactNode } from "react";

type Props = {
  point: Input["points"][number];
  index: number;
  x: number;
  y: number;
  accent: string;
};
/** One point, with its leader to its row in the ledger. */
export function ClusterPoint({
  point,
  index,
  x,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, alpha, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const hairline = shapes.stroke(stroke.hairline);
  return (
    <g>
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
        fillOpacity={atomic.opacity["50"]}
        stroke={color.text}
        strokeWidth={hairline}
      />
    </g>
  );
}
