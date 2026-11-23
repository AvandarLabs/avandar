import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  ROUTE_CUE,
  ROUTE_DRAW_FRAMES,
  ROUTE_SETTLED_AT,
} from "./NodeTraversal.constants";
import { TraversalEdges } from "./TraversalEdges";
import { TraversalNodes } from "./TraversalNodes";
import { TraversalRoute } from "./TraversalRoute";
import type { Props } from "./NodeTraversal.types";
import type { ReactNode } from "react";

/** Renders NodeTraversal within the authored stock graphics. */
export function NodeTraversal({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { nodes, edges, route } = input;
  const progress =
    motion.ramp(
      frame,
      ROUTE_CUE,
      Math.min(motion.scale(ROUTE_DRAW_FRAMES), ROUTE_SETTLED_AT - ROUTE_CUE),
      motion.travel.easing,
    ) *
    (route.length - 1);
  const drawing = {
    input,
    frame,
    accent,
    color,
    motion,
    nodes,
    edges,
    route,
    progress,
  };
  return (
    <g>
      <Eyebrow>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["node-traversal"].directedTraversal,
        })}
      </Eyebrow>
      <TraversalEdges {...drawing} />
      <TraversalRoute {...drawing} />
      <TraversalNodes {...drawing} />
    </g>
  );
}
