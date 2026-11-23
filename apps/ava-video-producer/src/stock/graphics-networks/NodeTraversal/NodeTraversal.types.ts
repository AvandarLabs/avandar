import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { NodeTraversalInput } from "../../presets/NodeTraversal/NodeTraversal.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within NodeTraversal. */
export type Props = GraphicProps & {
  input: NodeTraversalInput;
};
/** Rendering data shared within NodeTraversal. */
export type TraversalEdgesData = {
  input: Props["input"];
  frame: Props["frame"];
  accent: Props["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  nodes: Props["input"]["nodes"];
  edges: Props["input"]["edges"];
  route: Props["input"]["route"];
};
/** Rendering data shared within NodeTraversal. */
export type TraversalNodesData = {
  frame: Props["frame"];
  accent: Props["accent"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  nodes: Props["input"]["nodes"];
  route: Props["input"]["route"];
  progress: number;
};
/** Rendering data shared within NodeTraversal. */
export type TraversalRouteData = {
  frame: Props["frame"];
  accent: Props["accent"];
  nodes: Props["input"]["nodes"];
  route: Props["input"]["route"];
  progress: number;
};
/** Rendering data shared within NodeTraversal. */
export type KeyedTraversalStep = {
  key: string;
  from: NodeTraversalInput["nodes"][number];
  to: NodeTraversalInput["nodes"][number];
  stepOffset: number;
};
