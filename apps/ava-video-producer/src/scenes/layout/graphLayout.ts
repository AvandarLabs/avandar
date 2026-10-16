import { DUR, ramp } from "../../motion";
import type { FlowStep, GraphEdge, GraphNode, TraversalBeat } from "../scenes.types";
import { assertFrame, assertUnit, type Point, type Rect } from "./geometry";
import { fitTextLines } from "./textLayout";

export function validateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  traversal: TraversalBeat[] = [],
): void {
  if (!nodes.length || nodes.length > 12)
    throw new Error("GraphScene needs 1 to 12 nodes");
  const ids = new Set<string>();
  nodes.forEach((node) => {
    if (!node.id || ids.has(node.id))
      throw new Error(`Duplicate or empty graph node id: ${node.id}`);
    if (!node.label.trim())
      throw new Error(`Graph node ${node.id} needs a label`);
    ids.add(node.id);
    assertUnit(node.x, `${node.id}.x`);
    assertUnit(node.y, `${node.id}.y`);
  });
  const edgeIds = new Set<string>();
  edges.forEach((edge) => {
    if (!edge.id || edgeIds.has(edge.id))
      throw new Error(`Duplicate or empty edge id: ${edge.id}`);
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to)
      throw new Error(`Invalid graph edge: ${edge.id}`);
    edgeIds.add(edge.id);
  });
  traversal.forEach((beat, index) => {
    assertFrame(beat.atFrame, "traversal.atFrame");
    if (!ids.has(beat.nodeId))
      throw new Error(`Unknown traversal node: ${beat.nodeId}`);
    if (index && beat.atFrame <= traversal[index - 1].atFrame)
      throw new Error("Traversal frames must be strictly increasing");
  });
}

/** Normalized centers map inside a safe inset so edge nodes remain on canvas. */
export function graphNodeRect(node: GraphNode, bounds: Rect): Rect {
  const width = Math.min(280, bounds.width * 0.205);
  const label = fitTextLines(
    [node.label],
    width - 40,
    node.detail ? 70 : 130,
    25,
    19,
  );
  const detail = node.detail
    ? fitTextLines([node.detail], width - 40, 68, 19, 16)
    : undefined;
  const height = Math.max(
    128,
    Math.ceil(
      40 +
        label.lines.length * label.fontSize * 1.22 +
        (detail ? 10 + detail.lines.length * detail.fontSize * 1.22 : 0),
    ),
  );
  return {
    x: bounds.x + node.x * (bounds.width - width),
    y: bounds.y + node.y * (bounds.height - height),
    width,
    height,
  };
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Ray/rectangle intersection keeps every connector out of the node text. */
export function edgeEndpoints(
  from: Rect,
  to: Rect,
): { start: Point; end: Point } {
  const a = rectCenter(from);
  const b = rectCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (!dx && !dy)
    throw new Error("Connected graph nodes cannot share a center");
  const intersect = (box: Rect, origin: Point, x: number, y: number): Point => {
    const t = Math.min(
      x === 0 ? Infinity : box.width / 2 / Math.abs(x),
      y === 0 ? Infinity : box.height / 2 / Math.abs(y),
    );
    return { x: origin.x + x * t, y: origin.y + y * t };
  };
  return { start: intersect(from, a, dx, dy), end: intersect(to, b, -dx, -dy) };
}

/** A serpentine grid keeps a simple sequential process connected locally. */
export function flowNodes(steps: FlowStep[]): GraphNode[] {
  if (!steps.length || steps.length > 6)
    throw new Error("FlowchartScene needs 1 to 6 steps");
  const columns = Math.min(3, steps.length);
  const rows = Math.ceil(steps.length / columns);
  return steps.map((step, index) => {
    const row = Math.floor(index / columns);
    const column = row % 2 ? columns - 1 - (index % columns) : index % columns;
    return {
      ...step,
      x: columns === 1 ? 0.5 : column / (columns - 1),
      y: rows === 1 ? 0.5 : row / (rows - 1),
    };
  });
}

export function nodeHighlight(
  frame: number,
  nodeId: string,
  traversal: TraversalBeat[],
): number {
  return Math.max(
    0,
    ...traversal.map((beat, index) =>
      beat.nodeId !== nodeId
        ? 0
        : ramp(frame, beat.atFrame, DUR.chip) *
          (index + 1 === traversal.length
            ? 1
            : 1 - ramp(frame, traversal[index + 1].atFrame, DUR.chip)),
    ),
  );
}

export function edgeHighlight(
  frame: number,
  edge: GraphEdge,
  traversal: TraversalBeat[],
): number {
  let amount = 0;
  traversal.forEach((beat, index) => {
    if (
      index &&
      traversal[index - 1].nodeId === edge.from &&
      beat.nodeId === edge.to
    ) {
      amount = Math.max(amount, ramp(frame, beat.atFrame, DUR.sheet));
    }
  });
  return amount;
}
