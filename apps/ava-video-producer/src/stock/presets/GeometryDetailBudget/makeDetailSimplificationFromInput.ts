import type { Input } from "./GeometryDetailBudget.schema";
type Vertex = Input["vertices"][number];
type Event = {
  start: number;
  end: number;
  farthest: number;
  distance: number;
  split: boolean;
  projection: Vertex;
};
type RemovedVertex = {
  index: number;
  start: number;
  end: number;
  projection: Vertex;
  distance: number;
};
function _project({
  point,
  start,
  end,
}: Readonly<{ point: Vertex; start: Vertex; end: Vertex }>): {
  projection: Vertex;
  distance: number;
} {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const square = dx * dx + dy * dy;
  const fraction = square
    ? Math.max(
        0,
        Math.min(
          1,
          ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / square,
        ),
      )
    : 0;
  const projection: Vertex = [
    start[0] + fraction * dx,
    start[1] + fraction * dy,
  ];
  return {
    projection,
    distance: Math.hypot(point[0] - projection[0], point[1] - projection[1]),
  };
}
/** Inputs for visit. */
type VisitOptions = {
  vertices: Vertex[];
  tolerance: number;
  start: number;
  end: number;
  events: Event[];
  kept: Set<number>;
};

function _visit({
  vertices,
  tolerance,
  start,
  end,
  events,
  kept,
}: Readonly<VisitOptions>): void {
  if (end - start < 2) {
    return;
  }
  const candidates = vertices.slice(start + 1, end).map((point, index) => ({
    ..._project({ point, start: vertices[start], end: vertices[end] }),
    index: start + 1 + index,
  }));
  const farthest = candidates.reduce((maximum, candidate) =>
    candidate.distance > maximum.distance ? candidate : maximum,
  );
  const split = farthest.distance > tolerance;
  events.push({
    start,
    end,
    farthest: farthest.index,
    distance: farthest.distance,
    split,
    projection: farthest.projection,
  });
  if (split) {
    kept.add(farthest.index);
    _visit({ vertices, tolerance, start, end: farthest.index, events, kept });
    _visit({ vertices, tolerance, start: farthest.index, end, events, kept });
  }
}
/** Deterministic finite-segment Douglas-Peucker with inspectable recursion. */
export function makeDetailSimplificationFromInput(input: Readonly<Input>): {
  events: Event[];
  keptIndices: number[];
  removed: RemovedVertex[];
} {
  const events: Event[] = [];
  const kept = new Set([0, input.vertices.length - 1]);
  _visit({
    vertices: input.vertices,
    tolerance: input.tolerance,
    start: 0,
    end: input.vertices.length - 1,
    events,
    kept,
  });
  const keptIndices = [...kept].sort((left, right) => left - right);
  const removed = input.vertices.flatMap((point, index) => {
    if (kept.has(index)) {
      return [];
    }
    const end = keptIndices.find((retained) => retained > index)!;
    const start = keptIndices[keptIndices.indexOf(end) - 1];
    return [
      {
        index,
        start,
        end,
        ..._project({
          point,
          start: input.vertices[start],
          end: input.vertices[end],
        }),
      },
    ];
  });
  return { events, keptIndices, removed };
}
