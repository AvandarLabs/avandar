import { SketchedShape } from "../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
} from "../theme/useGraphicTheme/useGraphicTheme";
import { Arrive } from "./Arrive";
import { Text } from "./Text";
import type { NodeSize } from "./graphicCommon.types";
import type { ReactNode } from "react";

const NODE_RADIUS_KEYS = {
  xs: "radiusXs",
  sm: "radiusSm",
  md: "radiusMd",
  lg: "radiusLg",
  xl: "radiusXl",
} as const;

/**
 * A themed node: active ring, outline, accent tint, centre dot, label, and
 * optional detail. `size` picks a themed radius; `radius` is a content
 * override that out-of-scope presets still pass.
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
}: {
  x: number;
  y: number;
  label: string;
  detail?: string;
  frame: number;
  index?: number;
  accent: string;
  active?: number;
  size?: NodeSize;
  radius?: number;
}): ReactNode {
  const node = useGraphicProps("Node", {});
  const scales = useGraphicShapeScales();
  const r = radius ?? node[NODE_RADIUS_KEYS[size]];
  return (
    <Arrive frame={frame} index={index}>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: r + node.ringSpread }}
        profile={node.sketch}
        fill="none"
        stroke={accent}
        strokeOpacity={active * node.ringAlpha}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r }}
        profile={node.sketch}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={scales.stroke(node.strokeWidth)}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r }}
        profile={node.sketch}
        fill={accent}
        fillOpacity={active * node.tintAlpha}
        stroke={accent}
        strokeOpacity={node.outlineAlpha + active * (1 - node.outlineAlpha)}
        strokeWidth={scales.stroke(node.strokeWidth)}
      />
      <circle
        cx={x}
        cy={y}
        r={node.coreRadius + active * node.coreGrowth}
        fill={accent}
      />
      <Text role="label" x={x} y={y + r + node.labelOffset} anchor="middle">
        {label}
      </Text>
      {detail ? (
        <Text role="detail" x={x} y={y + r + node.detailOffset} anchor="middle">
          {detail}
        </Text>
      ) : null}
    </Arrive>
  );
}
