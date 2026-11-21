import { GraphLayout } from "../../layout/GraphLayout";
import { TextLayout } from "../../layout/TextLayout";
import { GraphNodeCard } from "./GraphNodeCard/GraphNodeCard";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { GraphNode, GraphSceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  traversal: NonNullable<GraphSceneProps["traversal"]>;
  revealAtFrame: number;
  node: GraphNode;
  index: number;
  rects: Map<string, Rect>;
  nodeBorderWidth: number;
};
/** Renders one graph node view. */
export function GraphNodeView({
  node,
  index,
  ...context
}: Readonly<Props>): ReactNode {
  const { frame, motion, traversal, rects } = context;
  const rect = rects.get(node.id)!;
  const active = GraphLayout.nodeHighlight({
    frame,
    nodeId: node.id,
    traversal,
    motion,
  });
  const { label, detail } = _getGraphNodeCopyFromNode({ node, rect });
  return (
    <GraphNodeCard
      key={node.id}
      {...context}
      {...{ node, index, rect, active, label, detail }}
    />
  );
}

/** Fits the label and optional detail into one measured graph card. */
function _getGraphNodeCopyFromNode({
  node,
  rect,
}: Readonly<{ node: GraphNode; rect: Rect }>): {
  label: ReturnType<typeof TextLayout.fitTextLines>;
  detail: ReturnType<typeof TextLayout.fitTextLines> | undefined;
} {
  const label = TextLayout.fitTextLines({
    lines: [node.label],
    width: rect.width - 40,
    height: node.detail ? 70 : 130,
    requested: 25,
    minimum: 19,
  });
  const detail = node.detail
    ? TextLayout.fitTextLines({
        lines: [node.detail],
        width: rect.width - 40,
        height: 68,
        requested: 19,
        minimum: 16,
      })
    : undefined;
  return { label, detail };
}
