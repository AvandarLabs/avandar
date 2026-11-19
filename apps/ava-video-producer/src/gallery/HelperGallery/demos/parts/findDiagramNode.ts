/** Node centres of the preview diagram, on the 960 by 600 Atlas canvas. */
export const DIAGRAM_NODES = [
  { id: "source", x: 150, y: 170 },
  { id: "join", x: 300, y: 220 },
  { id: "filter", x: 470, y: 150 },
  { id: "model", x: 520, y: 380 },
  { id: "chart", x: 760, y: 220 },
  { id: "share", x: 800, y: 450 },
] as const;

/** The size of one preview diagram node. */
export const DIAGRAM_NODE_SIZE = { width: 150, height: 64 };

/** The preview diagram node with the given id. */
export function findDiagramNode(id: string): (typeof DIAGRAM_NODES)[number] {
  return DIAGRAM_NODES.find((node) => {
    return node.id === id;
  })!;
}
