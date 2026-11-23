import { useId } from "react";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { GraphLayout } from "../layout/GraphLayout";
import { SceneGeometry } from "../layout/SceneGeometry";
import type { Rect } from "../layout/SceneGeometry";
import type { GraphSceneProps } from "../scenes.types";
import type { GraphCanvas } from "./GraphCanvas/GraphCanvas";
import type { ComponentProps } from "react";

type GraphInput = GraphSceneProps &
  Required<
    Pick<GraphSceneProps, "width" | "height" | "traversal" | "revealAtFrame">
  >;
/** Keeps graph validation and renderer hook reads in their original order. */
export function useGraphSceneState({
  input,
}: Readonly<{ input: GraphInput }>): ComponentProps<typeof GraphCanvas> {
  const { rects, indices } = _getGraphLayoutFromScene(input);
  const markerId = `arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const fontSizes = useVideoTheme().mantine.fontSizes;
  const spacing = useVideoTheme().mantine.spacing;
  const scene = tokens.color.scene;
  const cardTitle = tokens.text.stage.cardTitle;
  const edgeWidth = scales.stroke(tokens.stroke.emphasis);
  const nodeBorderWidth = scales.stroke(tokens.stroke.default);

  return {
    ...input,
    rects,
    indices,
    markerId,
    tokens,
    motion,
    scales,
    fontSizes,
    spacing,
    scene,
    cardTitle,
    edgeWidth,
    nodeBorderWidth,
  };
}

type GraphLayoutOptions = Pick<
  GraphSceneProps,
  "nodes" | "edges" | "title" | "kicker"
> & {
  traversal: NonNullable<GraphSceneProps["traversal"]>;
  revealAtFrame: number;
  width: number;
  height: number;
};
/** Validates graph data before deriving normalized node geometry. */
function _getGraphLayoutFromScene({
  nodes,
  edges,
  traversal,
  revealAtFrame,
  width,
  height,
  title,
  kicker,
}: Readonly<GraphLayoutOptions>): {
  rects: Map<string, Rect>;
  indices: Map<string, number>;
} {
  GraphLayout.validateGraph({
    nodes,
    edges,
    traversal,
  });
  SceneGeometry.assertFrame({
    value: revealAtFrame,
    name: "revealAtFrame",
  });
  const bounds = SceneGeometry.sceneBounds({
    width,
    height,
    hasHeading: Boolean(title || kicker),
  });
  const rects = new Map(
    nodes.map((node) => {
      return [
        node.id,
        GraphLayout.graphNodeRect({
          node,
          bounds,
        }),
      ];
    }),
  );
  const indices = new Map(
    nodes.map((node, index) => {
      return [node.id, index];
    }),
  );
  return { rects, indices };
}
