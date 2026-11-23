import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Arrive } from "../Arrive/Arrive";
import { NODE_RADIUS_KEYS } from "./CircleNode.constants";
import { NodeLabels } from "./NodeLabels";
import { NodeRings } from "./NodeRings";
import type { Props } from "./CircleNode.types";
import type { ReactNode } from "react";

/**
 * A themed node for stock network studies. Size chooses a theme radius, and
 * radius supplies an authored override when a preset needs a fixed size.
 */
export function CircleNode({
  x,
  y,
  label,
  detail,
  frame,
  index = 0,
  accent,
  active = 0,
  size = "md",
  radius,
}: Readonly<Props>): ReactNode {
  const node = GraphicThemeHooks.useGraphicProps({
    name: "Node",
    props: {},
  });
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const nodeRadius = radius ?? node[NODE_RADIUS_KEYS[size]];
  return (
    <Arrive frame={frame} index={index}>
      <NodeRings {...{ x, y, accent, active, node, scales, nodeRadius }} />
      <circle
        cx={x}
        cy={y}
        r={node.coreRadius + active * node.coreGrowth}
        fill={accent}
      />
      <NodeLabels {...{ x, y, label, detail, nodeRadius, node }} />
    </Arrive>
  );
}
