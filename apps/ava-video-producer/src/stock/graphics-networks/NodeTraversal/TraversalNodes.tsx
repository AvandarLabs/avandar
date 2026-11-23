import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Caption } from "../../graphics-common/Caption";
import { CircleNode } from "../../graphics-common/CircleNode/CircleNode";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { getClampedUnitFromValue } from "./getClampedUnitFromValue";
import { CAPTION_CUE } from "./NodeTraversal.constants";
import type { TraversalNodesData } from "./NodeTraversal.types";
import type { ReactNode } from "react";

type Props = TraversalNodesData;

/** Renders the traversal nodes layer for NodeTraversal. */
export function TraversalNodes(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.nodes.map((node, i) => {
        const routeIndex = options.route.indexOf(i);
        return (
          <CircleNode
            key={node.label}
            {...node}
            frame={options.frame}
            index={i}
            accent={routeIndex < 0 ? options.color.inactive : options.accent}
            active={
              routeIndex < 0
                ? 0
                : getClampedUnitFromValue(options.progress - routeIndex + 1)
            }
            size="lg"
          />
        );
      })}
      <g
        opacity={options.motion.ramp(
          options.frame,
          CAPTION_CUE,
          options.motion.sheet,
        )}
      >
        <Caption>
          {getStockDisplayCopyFromDescriptor({
            descriptor:
              LEGACY_DISPLAY_COPY["node-traversal"]
                .aSelectedPathThroughAConnectedSystem,
          })}
        </Caption>
      </g>
    </>
  );
}
