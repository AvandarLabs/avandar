import { SketchedShape } from "../../../../../stock/primitives/SketchedShape";
import { useVideoShapeScales } from "../../../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import { DIAGRAM_NODES, findDiagramNode } from "../findDiagramNode";
import { DiagramNode } from "./DiagramNode/DiagramNode";
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

/**
 * An abstract vector diagram for the camera and departure previews, drawn
 * in the 960 by 600 coordinates those helpers default to.
 */
export function DemoDiagram(): ReactNode {
  const { stroke, sketch } = useVideoTheme().semantic;
  const scales = useVideoShapeScales();
  const colors = DemoTheme.useDemoColors();
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
