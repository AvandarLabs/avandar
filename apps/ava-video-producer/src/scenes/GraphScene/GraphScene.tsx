import { SceneShell } from "../SceneShell/SceneShell";
import { GraphCanvas } from "./GraphCanvas/GraphCanvas";
import { useGraphSceneState } from "./useGraphSceneState";
import type { GraphSceneProps } from "../scenes.types";
import type { ReactNode } from "react";
/**
 * An editorial graph, with authored placement and directed traversal. Edges
 * draw at the emphasis stroke through the theme's shape sketch, node cards
 * take `text.stage.cardTitle`, and traversal lights them in the strong brand
 * colour of the scene palette.
 */
export function GraphScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  nodes,
  edges,
  traversal = [],
  revealAtFrame = 10,
}: Readonly<Props>): ReactNode {
  const content = useGraphSceneState({
    input: {
      frame,
      width,
      height,
      title,
      kicker,
      headingReveal,
      nodes,
      edges,
      traversal,
      revealAtFrame,
    },
  });
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <GraphCanvas {...content} />
    </SceneShell>
  );
}

type Props = GraphSceneProps;
