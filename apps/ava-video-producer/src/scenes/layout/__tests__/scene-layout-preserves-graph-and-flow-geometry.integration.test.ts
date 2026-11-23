import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { GraphLayout } from "../GraphLayout";
import { SceneGeometry } from "../SceneGeometry";
import type { GraphNode, TraversalBeat } from "../../scenes.types";

test("graph placement preserves cards at normalized canvas boundaries at both delivery ratios", () => {
  Array.from([
    [1600, 1000],
    [1920, 1080],
  ]).forEach(([width, height]) => {
    const bounds = SceneGeometry.sceneBounds({
      width,
      height,
      hasHeading: true,
    });
    Array.from([0, 0.5, 1]).forEach((x) => {
      Array.from([0, 0.5, 1]).forEach((y) => {
        const rect = GraphLayout.graphNodeRect({
          node: { id: "n", label: "Node", x, y },
          bounds,
        });
        assert.ok(rect.x >= bounds.x && rect.y >= bounds.y);
        assert.ok(rect.x + rect.width <= bounds.x + bounds.width);
        assert.ok(rect.y + rect.height <= bounds.y + bounds.height);
      });
    });
  });
});

test("connectors terminate on card boundaries, including vertical and diagonal paths", () => {
  const a = { x: 0, y: 0, width: 100, height: 80 };
  assert.deepEqual(
    GraphLayout.edgeEndpoints({
      from: a,
      to: { ...a, x: 300 },
    }),
    {
      start: { x: 100, y: 40 },
      end: { x: 300, y: 40 },
    },
  );
  assert.deepEqual(
    GraphLayout.edgeEndpoints({
      from: a,
      to: { ...a, y: 300 },
    }),
    {
      start: { x: 50, y: 80 },
      end: { x: 50, y: 300 },
    },
  );
  const diagonal = GraphLayout.edgeEndpoints({
    from: a,
    to: { ...a, x: 300, y: 300 },
  });
  assert.deepEqual(diagonal.start, { x: 90, y: 80 });
  assert.deepEqual(diagonal.end, { x: 310, y: 300 });
  assert.throws(() => {
    return GraphLayout.edgeEndpoints({
      from: a,
      to: a,
    });
  }, /share a center/);
});

test("short graph cards reserve connector clearance without changing size during animation", () => {
  const bounds = SceneGeometry.sceneBounds({
    width: 1600,
    height: 1000,
    hasHeading: true,
  });
  const a = GraphLayout.graphNodeRect({
    node: {
      id: "cases",
      label: "240 cases",
      detail: "Fictional response records",
      x: 0.5,
      y: 0.5,
    },
    bounds,
  });
  const b = GraphLayout.graphNodeRect({
    node: {
      id: "districts",
      label: "6 districts",
      detail: "Geography and summaries",
      x: 0.5,
      y: 0.86,
    },
    bounds,
  });
  assert.ok(b.y - (a.y + a.height) >= 40);
  assert.ok(a.height >= 128 && b.height >= 128);
});

test("graph validates references and ordering, while traversal is deterministic under random seeks", () => {
  const nodes: GraphNode[] = [
    { id: "a", label: "A", x: 0, y: 0 },
    { id: "b", label: "B", x: 1, y: 1 },
  ];
  const edge = { id: "a-b", from: "a", to: "b" };
  const beats: TraversalBeat[] = [
    { nodeId: "a", atFrame: 10 },
    { nodeId: "b", atFrame: 60 },
  ];
  GraphLayout.validateGraph({
    nodes,
    edges: [edge],
    traversal: beats,
  });
  assert.equal(
    GraphLayout.nodeHighlight({ frame: 40, nodeId: "a", traversal: beats }),
    1,
  );
  assert.equal(
    GraphLayout.nodeHighlight({ frame: 80, nodeId: "a", traversal: beats }),
    0,
  );
  assert.equal(
    GraphLayout.nodeHighlight({ frame: 80, nodeId: "b", traversal: beats }),
    1,
  );
  assert.equal(
    GraphLayout.edgeHighlight({ frame: 59, edge, traversal: beats }),
    0,
  );
  assert.equal(
    GraphLayout.edgeHighlight({ frame: 100, edge, traversal: beats }),
    1,
  );
  assert.equal(
    GraphLayout.nodeHighlight({ frame: 40, nodeId: "a", traversal: beats }),
    1,
  );
  _assertInvalidGraphContracts({ nodes, edge, beats });
});

test("flowchart routes sequential nodes along a serpentine grid without losing input order", () => {
  const steps = Array.from({ length: 6 }, (_, index) => {
    return { id: String(index), label: String(index) };
  });
  const nodes = GraphLayout.flowNodes(steps);
  assert.deepEqual(nodes.map(prop("id")), steps.map(prop("id")));
  assert.deepEqual(
    nodes.map(({ x, y }) => {
      return [x, y];
    }),
    [
      [0, 0],
      [0.5, 0],
      [1, 0],
      [1, 1],
      [0.5, 1],
      [0, 1],
    ],
  );
  assert.deepEqual(
    GraphLayout.flowNodes(steps.slice(0, 1)).map(({ x, y }) => {
      return [x, y];
    }),
    [[0.5, 0.5]],
  );
  assert.throws(() => {
    return GraphLayout.flowNodes([]);
  }, /1 to 6/);
});

test("a packet travels its edge only during its window, in its direction", () => {
  const start = { x: 0, y: 0 };
  const end = { x: 100, y: 0 };
  const packets = [
    { atFrame: 10, durationInFrames: 10 },
    { atFrame: 30, durationInFrames: 10, direction: "reverse" as const },
  ];
  assert.deepEqual(
    GraphLayout.getPacketPositions({ frame: 5, packets, start, end }),
    [],
  );
  const forward = GraphLayout.getPacketPositions({
    frame: 15,
    packets,
    start,
    end,
  });
  assert.equal(forward.length, 1);
  assert.ok(forward[0].x > 0 && forward[0].x < 100);
  const reverse = GraphLayout.getPacketPositions({
    frame: 33,
    packets,
    start,
    end,
  });
  assert.ok(reverse[0].x > 50, "a reverse packet starts at the far end");
  assert.deepEqual(
    GraphLayout.getPacketPositions({ frame: 45, packets, start, end }),
    [],
  );
});

test("parallel edges with offsets stay apart and still meet both card borders", () => {
  const a = { x: 0, y: 0, width: 100, height: 120 };
  const b = { x: 300, y: 0, width: 100, height: 120 };
  const upper = GraphLayout.offsetEdgeEndpoints({
    from: a,
    to: b,
    offset: -0.5,
  });
  const lower = GraphLayout.offsetEdgeEndpoints({
    from: a,
    to: b,
    offset: 0.5,
  });
  assert.ok(upper.start.y < 60 && lower.start.y > 60);
  assert.equal(upper.start.x, 100);
  assert.equal(lower.end.x, 300);
});

test("a wide node with list items is taller than its label alone", () => {
  const bounds = SceneGeometry.sceneBounds({
    width: 1920,
    height: 1080,
    hasHeading: true,
  });
  const plain = GraphLayout.graphNodeRect({
    node: { id: "n", label: "Core", x: 0, y: 0.5 },
    bounds,
  });
  const listed = GraphLayout.graphNodeRect({
    node: {
      id: "n",
      label: "Core",
      x: 0,
      y: 0.5,
      width: 0.4,
      items: ["a", "b", "c", "d", "e", "f"],
    },
    bounds,
  });
  assert.equal(listed.width, bounds.width * 0.4);
  assert.ok(listed.height > plain.height);
});

/** Graph values used to exercise invalid references and traversal order. */
type InvalidGraphContractInputs = {
  nodes: GraphNode[];
  edge: Parameters<typeof GraphLayout.validateGraph>[0]["edges"][number];
  beats: TraversalBeat[];
};

function _assertInvalidGraphContracts(
  options: Readonly<InvalidGraphContractInputs>,
): void {
  const { nodes, edge, beats } = options;
  assert.throws(() => {
    return GraphLayout.validateGraph({
      nodes,
      edges: [{ ...edge, to: "missing" }],
    });
  }, /Invalid graph edge/);
  assert.throws(() => {
    return GraphLayout.validateGraph({
      nodes: [...nodes, nodes[0]],
      edges: [],
    });
  }, /Duplicate/);
  assert.throws(() => {
    return GraphLayout.validateGraph({
      nodes,
      edges: [edge],
      traversal: [...beats].reverse(),
    });
  }, /increasing/);
}
