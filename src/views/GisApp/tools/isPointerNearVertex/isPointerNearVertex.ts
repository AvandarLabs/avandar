type Vertex = readonly [number, number];

type Options = {
  pointer: { x: number; y: number };
  vertex: Vertex;
  project: (vertex: Vertex) => { x: number; y: number };
  radiusPx: number;
};

/** Whether a screen pointer is within `radiusPx` of a projected vertex. */
export function isPointerNearVertex(options: Options): boolean {
  const projected = options.project(options.vertex);
  const dx = options.pointer.x - projected.x;
  const dy = options.pointer.y - projected.y;
  return dx * dx + dy * dy <= options.radiusPx * options.radiusPx;
}
