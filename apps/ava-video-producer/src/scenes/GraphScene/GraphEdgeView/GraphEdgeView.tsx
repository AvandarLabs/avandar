import { GraphLayout } from "../../layout/GraphLayout";
import { TextLayout } from "../../layout/TextLayout";
import { GraphEdgeArtwork } from "./GraphEdgeArtwork/GraphEdgeArtwork";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { GraphSceneProps, GraphEdge } from "../../scenes.types";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  traversal: NonNullable<GraphSceneProps["traversal"]>;
  revealAtFrame: number;
  edge: GraphEdge;
  rects: Map<string, Rect>;
  indices: Map<string, number>;
  markerId: string;
  fontSizes: ReturnType<typeof useVideoTheme>["mantine"]["fontSizes"];
  edgeWidth: number;
};
type EdgeGeometry = {
  start: ReturnType<typeof GraphLayout.offsetEdgeEndpoints>["start"];
  end: ReturnType<typeof GraphLayout.offsetEdgeEndpoints>["end"];
  path: string;
  labelWidth: number;
};
/** Endpoint routing, path text and label extent for one graph connector. */
function _getEdgeGeometry({
  edge,
  rects,
}: Readonly<Pick<Props, "edge" | "rects">>): EdgeGeometry {
  const { start, end } = GraphLayout.offsetEdgeEndpoints({
    from: rects.get(edge.from)!,
    to: rects.get(edge.to)!,
    offset: edge.offset ?? 0,
  });
  const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const labelWidth = edge.label
    ? TextLayout.textUnits(edge.label) * 18 + 24
    : 0;

  return { start, end, path, labelWidth };
}

/** Samples endpoint geometry, reveal and traversal for one edge. */
function _makeGraphEdgeStateFromEdge({
  edge,
  frame,
  rects,
  indices,
  revealAtFrame,
  motion,
  traversal,
  ...context
}: Readonly<Props>): ComponentProps<typeof GraphEdgeArtwork> {
  const { start, end, path, labelWidth } = _getEdgeGeometry({ edge, rects });
  const revealAt =
    revealAtFrame +
    Math.max(indices.get(edge.from)!, indices.get(edge.to)!) *
      motion.stagger.list +
    motion.panel;
  const reveal = motion.ramp(
    frame,
    revealAt,
    motion.sheet,
    motion.reveal.easing,
  );
  const highlight = GraphLayout.edgeHighlight({
    frame,
    edge,
    traversal,
    motion,
  });

  return {
    ...context,
    edge,
    frame,
    motion,
    start,
    end,
    reveal,
    highlight,
    path,
    labelWidth,
  };
}

/** Renders one graph edge view. */
export function GraphEdgeView({
  edge,
  ...context
}: Readonly<Props>): ReactNode {
  const content = _makeGraphEdgeStateFromEdge({ edge, ...context });
  return <GraphEdgeArtwork {...content} />;
}
