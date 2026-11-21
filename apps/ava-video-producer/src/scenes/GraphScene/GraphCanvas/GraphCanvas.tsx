import { GraphEdgeView } from "../GraphEdgeView/GraphEdgeView";
import { GraphNodeView } from "../GraphNodeView/GraphNodeView";
import css from "./GraphCanvas.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { GraphSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  width: number;
  height: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  nodes: GraphSceneProps["nodes"];
  edges: GraphSceneProps["edges"];
  traversal: NonNullable<GraphSceneProps["traversal"]>;
  revealAtFrame: number;
  rects: Map<string, Rect>;
  indices: Map<string, number>;
  markerId: string;
  fontSizes: ReturnType<typeof useVideoTheme>["mantine"]["fontSizes"];
  edgeWidth: number;
  nodeBorderWidth: number;
};
/** Renders graph canvas. */
export function GraphCanvas({
  width,
  height,
  ...content
}: Readonly<Props>): ReactNode {
  const { edges, nodes, markerId, scene } = content;
  return (
    <>
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        className={css.graphCanvassvg1}
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={scene.mutedForeground} />
          </marker>
        </defs>
        {edges.map((edge) => {
          return <GraphEdgeView key={edge.id} edge={edge} {...content} />;
        })}
      </svg>
      {nodes.map((node, index) => {
        return (
          <GraphNodeView key={node.id} node={node} index={index} {...content} />
        );
      })}
    </>
  );
}
