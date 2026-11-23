import { Motion } from "../../../../motion";
import { positioned } from "../../../positioned";
import { _CornerTicks } from "../../_CornerTicks";
import { GraphNodeItems } from "../../GraphNodeItems/GraphNodeItems";
import { GraphNodeDetail } from "../GraphNodeDetail/GraphNodeDetail";
import { GraphNodeLabel } from "../GraphNodeLabel/GraphNodeLabel";
import type { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../../layout/SceneGeometry";
import type { TextLayout } from "../../../layout/TextLayout";
import type { GraphNode } from "../../../scenes.types";
import type { CSSProperties, ReactNode } from "react";

/** Node entry rise in pixels. */
const NODE_RISE = 10;
type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  revealAtFrame: number;
  node: GraphNode;
  index: number;
  nodeBorderWidth: number;
  rect: Rect;
  active: number;
  label: ReturnType<typeof TextLayout.fitTextLines>;
  detail: ReturnType<typeof TextLayout.fitTextLines> | undefined;
};
/** Renders graph node card. */
export function GraphNodeCard({
  node,
  label,
  detail,
  ...content
}: Readonly<Props>): ReactNode {
  const { frame, revealAtFrame, index, motion, scene, nodeBorderWidth } =
    content;
  return (
    <article
      key={node.id}
      aria-label={node.label}
      style={_getGraphNodeStyleFromState({ node, ...content })}
    >
      <GraphNodeLabel label={label} {...content} />
      {detail ? <GraphNodeDetail detail={detail} {...content} /> : null}
      <GraphNodeItems
        node={node}
        frame={frame}
        at={revealAtFrame + index * motion.stagger.list + motion.panel}
        motion={motion}
        color={scene.mutedForeground}
      />
      {node.frame === "ticks" ? (
        <_CornerTicks line={`${nodeBorderWidth}px solid ${scene.border}`} />
      ) : null}
    </article>
  );
}

/** Styles the node card at its sampled entrance and traversal state. */
function _getGraphNodeStyleFromState(
  options: Readonly<Omit<Props, "label" | "detail">>,
): CSSProperties {
  const {
    frame,
    tokens,
    motion,
    scales,
    spacing,
    scene,
    revealAtFrame,
    node,
    index,
    nodeBorderWidth,
    rect,
    active,
  } = options;
  return {
    ...positioned(rect),
    display: "flex",
    flexDirection: "column",
    padding: spacing.xs,
    justifyContent: node.items?.length ? "flex-start" : "center",
    border:
      node.frame === "ticks"
        ? "none"
        : `${nodeBorderWidth}px solid ${Motion.mixToken({
            t: active,
            from: scene.border,
            to: scene.brandStrong,
          })}`,
    borderRadius: scales.corner(tokens.corner.scene),
    background:
      node.frame === "ticks"
        ? "transparent"
        : Motion.mixToken({
            t: active,
            from: scene.card,
            to: scene.brandSoft,
          }),
    ...motion.enterAt(frame, revealAtFrame, index, { y: NODE_RISE }),
  };
}
