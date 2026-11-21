import { SketchedShape } from "../../../../stock/primitives/SketchedShape";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

/** Normalized edge path length. */
const EDGE_LENGTH = 1;
type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  edgeWidth: number;
  highlight: number;
  path: string;
};
/** Renders graph edge highlight. */
export function GraphEdgeHighlight({
  tokens,
  scene,
  edgeWidth,
  highlight,
  path,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={scene.brandStrong}
      strokeWidth={edgeWidth}
      pathLength={EDGE_LENGTH}
      strokeDasharray={EDGE_LENGTH}
      strokeDashoffset={EDGE_LENGTH - highlight}
      opacity={highlight > 0 ? 1 : 0}
    />
  );
}
