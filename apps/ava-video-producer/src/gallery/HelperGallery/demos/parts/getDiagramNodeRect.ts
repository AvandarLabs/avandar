import { DIAGRAM_NODE_SIZE, findDiagramNode } from "./findDiagramNode";
import type { MotionRect } from "../../../../motion-components/AnchoredOverlay";
import type { DIAGRAM_NODES } from "./findDiagramNode";

/** The rect a diagram node occupies, for cut-outs such as a departure. */
export function getDiagramNodeRect(
  id: (typeof DIAGRAM_NODES)[number]["id"],
): MotionRect {
  const node = findDiagramNode(id);
  return {
    x: node.x - DIAGRAM_NODE_SIZE.width / 2 - 8,
    y: node.y - DIAGRAM_NODE_SIZE.height / 2 - 8,
    width: DIAGRAM_NODE_SIZE.width + 16,
    height: DIAGRAM_NODE_SIZE.height + 16,
  };
}
