import { SketchedShape } from "../../primitives/SketchedShape";
import type { NodeRingsData } from "./CircleNode.types";
import type { ReactNode } from "react";

type Props = NodeRingsData;

/** Renders the node rings layer for CircleNode. */
export function NodeRings(options: Readonly<Props>): ReactNode {
  const { x, y, accent, active, node, scales, nodeRadius } = options;
  return (
    <>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: x,
          cy: y,
          r: nodeRadius + node.ringSpread,
        }}
        profile={node.sketch}
        fill="none"
        stroke={accent}
        strokeOpacity={active * node.ringAlpha}
      />
      <SketchedShape
        shape={{
          kind: "circle",
          cx: x,
          cy: y,
          r: nodeRadius,
        }}
        profile={node.sketch}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={scales.stroke(node.strokeWidth)}
      />
      <SketchedShape
        shape={{
          kind: "circle",
          cx: x,
          cy: y,
          r: nodeRadius,
        }}
        profile={node.sketch}
        fill={accent}
        fillOpacity={active * node.tintAlpha}
        stroke={accent}
        strokeOpacity={node.outlineAlpha + active * (1 - node.outlineAlpha)}
        strokeWidth={scales.stroke(node.strokeWidth)}
      />
    </>
  );
}
