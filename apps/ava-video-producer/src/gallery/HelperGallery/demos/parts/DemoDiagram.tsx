import { SketchedShape } from "../../../../stock/primitives/SketchedShape";
import { StockRect } from "../../../../stock/primitives/StockRect/StockRect";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../../videoTheme/useVideoTheme";
import { useDemoColors } from "../demoTheme";
import {
  DIAGRAM_NODE_SIZE,
  DIAGRAM_NODES,
  findDiagramNode,
} from "./findDiagramNode";
import type { ReactNode } from "react";

const EDGES = [
  ["source", "join"],
  ["join", "filter"],
  ["join", "model"],
  ["filter", "chart"],
  ["model", "share"],
  ["chart", "share"],
] as const;

const NODE_LABELS: Readonly<Record<string, string>> = {
  source: "Source",
  join: "Join",
  filter: "Filter",
  model: "Model",
  chart: "Chart",
  share: "Share",
};

/** One labelled node of the preview diagram. */
function DiagramNode({
  x,
  y,
  label,
}: {
  x: number;
  y: number;
  label: string;
}): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const scales = useVideoShapeScales();
  const colors = useDemoColors();
  return (
    <g
      transform={`translate(${x - DIAGRAM_NODE_SIZE.width / 2} ${y - DIAGRAM_NODE_SIZE.height / 2})`}
    >
      <StockRect
        width={DIAGRAM_NODE_SIZE.width}
        height={DIAGRAM_NODE_SIZE.height}
        rx={scales.corner(semantic.corner.label)}
        fill={colors.panel}
        stroke={colors.brand}
        strokeWidth={scales.stroke(semantic.stroke.default)}
      />
      <text
        x={DIAGRAM_NODE_SIZE.width / 2}
        y={DIAGRAM_NODE_SIZE.height / 2 + 7}
        textAnchor="middle"
        fill={colors.text}
        fontSize={mantine.fontSizes["2xl"]}
        fontWeight={atomic.fontWeight.semibold}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * An abstract vector diagram for the camera and departure previews, drawn
 * in the 960 by 600 coordinates those helpers default to.
 */
export function DemoDiagram(): ReactNode {
  const { stroke, sketch } = useVideoTheme().semantic;
  const scales = useVideoShapeScales();
  const colors = useDemoColors();
  return (
    <g>
      <rect width={960} height={600} fill={colors.ground} />
      {EDGES.map(([from, to]) => {
        const start = findDiagramNode(from);
        const end = findDiagramNode(to);
        return (
          <SketchedShape
            key={`${from}-${to}`}
            shape={{
              kind: "line",
              x1: start.x,
              y1: start.y,
              x2: end.x,
              y2: end.y,
            }}
            profile={sketch.shape}
            stroke={colors.line}
            strokeWidth={scales.stroke(stroke.emphasis)}
          />
        );
      })}
      {DIAGRAM_NODES.map((node) => {
        return (
          <DiagramNode
            key={node.id}
            x={node.x}
            y={node.y}
            label={NODE_LABELS[node.id]}
          />
        );
      })}
    </g>
  );
}
