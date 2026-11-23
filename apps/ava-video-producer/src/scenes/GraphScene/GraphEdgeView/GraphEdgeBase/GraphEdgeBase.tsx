import { SketchedShape } from "../../../../stock/primitives/SketchedShape";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

/** Normalized edge path length. */
const EDGE_LENGTH = 1;
type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  edgeWidth: number;
  reveal: number;
  path: string;
};
/** Renders graph edge base. */
export function GraphEdgeBase({
  tokens,
  scene,
  edgeWidth,
  reveal,
  path,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={scene.border}
      strokeWidth={edgeWidth}
      pathLength={EDGE_LENGTH}
      strokeDasharray={EDGE_LENGTH}
      strokeDashoffset={EDGE_LENGTH - reveal}
    />
  );
}
