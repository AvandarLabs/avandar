import { DEMO_COLORS } from "../demoTheme";
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
  return (
    <g
      transform={`translate(${x - DIAGRAM_NODE_SIZE.width / 2} ${y - DIAGRAM_NODE_SIZE.height / 2})`}
    >
      <rect
        width={DIAGRAM_NODE_SIZE.width}
        height={DIAGRAM_NODE_SIZE.height}
        rx={10}
        fill={DEMO_COLORS.panel}
        stroke={DEMO_COLORS.brand}
        strokeWidth={2}
      />
      <text
        x={DIAGRAM_NODE_SIZE.width / 2}
        y={DIAGRAM_NODE_SIZE.height / 2 + 7}
        textAnchor="middle"
        fill={DEMO_COLORS.text}
        fontSize={20}
        fontWeight={600}
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
  const labels: Record<string, string> = {
    source: "Source",
    join: "Join",
    filter: "Filter",
    model: "Model",
    chart: "Chart",
    share: "Share",
  };
  return (
    <g>
      <rect width={960} height={600} fill={DEMO_COLORS.ground} />
      {EDGES.map(([from, to]) => {
        const start = findDiagramNode(from);
        const end = findDiagramNode(to);
        return (
          <line
            key={`${from}-${to}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={DEMO_COLORS.line}
            strokeWidth={3}
          />
        );
      })}
      {DIAGRAM_NODES.map((node) => {
        return (
          <DiagramNode
            key={node.id}
            x={node.x}
            y={node.y}
            label={labels[node.id]}
          />
        );
      })}
    </g>
  );
}
