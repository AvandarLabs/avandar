import { GraphEdgeBase } from "../GraphEdgeBase/GraphEdgeBase";
import { GraphEdgeHighlight } from "../GraphEdgeHighlight/GraphEdgeHighlight";
import { GraphEdgeLabel } from "../GraphEdgeLabel/GraphEdgeLabel";
import { GraphEdgePackets } from "../GraphEdgePackets/GraphEdgePackets";
import type { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/videoThemeHelpers";
import type { Point } from "../../../layout/SceneGeometry";
import type { GraphEdge } from "../../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  edge: GraphEdge;
  markerId: string;
  fontSizes: ReturnType<typeof useVideoTheme>["mantine"]["fontSizes"];
  edgeWidth: number;
  start: Point;
  end: Point;
  reveal: number;
  highlight: number;
  path: string;
  labelWidth: number;
};
/** Renders graph edge artwork. */
export function GraphEdgeArtwork({
  edge,
  reveal,
  path,
  edgeWidth,
  markerId,
  ...content
}: Readonly<Props>): ReactNode {
  return (
    <g key={edge.id} opacity={reveal}>
      <GraphEdgeBase {...{ edgeWidth, reveal, path }} {...content} />
      {edge.arrow === false ? null : (
        // The arrowhead alone: markers draw without a stroke, scaled
        // by the edge's stroke width.
        <path
          d={path}
          fill="none"
          stroke="none"
          strokeWidth={edgeWidth}
          markerEnd={`url(#${markerId})`}
        />
      )}
      <GraphEdgeHighlight {...{ edgeWidth, path }} {...content} />
      <GraphEdgePackets edge={edge} {...content} />
      {edge.label ? <GraphEdgeLabel edge={edge} {...content} /> : null}
    </g>
  );
}
