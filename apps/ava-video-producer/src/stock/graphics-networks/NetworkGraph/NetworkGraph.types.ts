import type { ResolvedVideoComponents } from "../../../videoTheme/videoTheme.types";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { NetworkGraphInput } from "../../presets/NetworkGraph/NetworkGraph.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within NetworkGraph. */
export type Props = GraphicProps & {
  input: NetworkGraphInput;
};
/** Rendering data shared within NetworkGraph. */
export type NetworkEdgeData = {
  input: Props["input"];
  frame: Props["frame"];
  accent: Props["accent"];
  style: ResolvedVideoComponents["NetworkGraph"];
  color: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["color"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  nodes: Props["input"]["nodes"];
  a: Props["input"]["edges"][number][0];
  b: Props["input"]["edges"][number][1];
  i: number;
};
/** Rendering data shared within NetworkGraph. */
export type NetworkNodeData = {
  frame: Props["frame"];
  accent: Props["accent"];
  style: ResolvedVideoComponents["NetworkGraph"];
  node: Props["input"]["nodes"][number];
  i: number;
};
/** Rendering data shared within NetworkGraph. */
export type NetworkHeadingData = {
  input: Props["input"];
  accent: Props["accent"];
  layout: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["layout"];
};
