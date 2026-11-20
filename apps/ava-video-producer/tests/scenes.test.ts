import assert from "node:assert/strict";
import test from "node:test";
import {
  activeCaption,
  assertRect,
  captionBand,
  captionGeometry,
  edgeEndpoints,
  edgeHighlight,
  fitMetricContent,
  fitTextLines,
  flowNodes,
  formatMetric,
  getPacketPositions,
  graphNodeRect,
  nodeHighlight,
  offsetEdgeEndpoints,
  safePublicPath,
  sceneBounds,
  textUnits,
  validateCaptions,
  validateGraph,
} from "../src/scenes/layout/layout";
import type {
  CaptionCue,
  GraphNode,
  TraversalBeat,
} from "../src/scenes/scenes.types";

test("graph placement preserves cards at normalized canvas boundaries at both delivery ratios", () => {
  for (const [width, height] of [
    [1600, 1000],
    [1920, 1080],
  ]) {
    const bounds = sceneBounds(width, height, true);
    for (const x of [0, 0.5, 1])
      for (const y of [0, 0.5, 1]) {
        const rect = graphNodeRect({ id: "n", label: "Node", x, y }, bounds);
        assert.ok(rect.x >= bounds.x && rect.y >= bounds.y);
        assert.ok(rect.x + rect.width <= bounds.x + bounds.width);
        assert.ok(rect.y + rect.height <= bounds.y + bounds.height);
      }
  }
});
test("connectors terminate on card boundaries, including vertical and diagonal paths", () => {
  const a = { x: 0, y: 0, width: 100, height: 80 };
  assert.deepEqual(edgeEndpoints(a, { ...a, x: 300 }), {
    start: { x: 100, y: 40 },
    end: { x: 300, y: 40 },
  });
  assert.deepEqual(edgeEndpoints(a, { ...a, y: 300 }), {
    start: { x: 50, y: 80 },
    end: { x: 50, y: 300 },
  });
  const diagonal = edgeEndpoints(a, { ...a, x: 300, y: 300 });
  assert.deepEqual(diagonal.start, { x: 90, y: 80 });
  assert.deepEqual(diagonal.end, { x: 310, y: 300 });
  assert.throws(() => {
    return edgeEndpoints(a, a);
  }, /share a center/);
});
test("short graph cards reserve connector clearance without changing size during animation", () => {
  const bounds = sceneBounds(1600, 1000, true);
  const a = graphNodeRect(
    {
      id: "cases",
      label: "240 cases",
      detail: "Fictional response records",
      x: 0.5,
      y: 0.5,
    },
    bounds,
  );
  const b = graphNodeRect(
    {
      id: "districts",
      label: "6 districts",
      detail: "Geography and summaries",
      x: 0.5,
      y: 0.86,
    },
    bounds,
  );
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
  validateGraph(nodes, [edge], beats);
  assert.equal(nodeHighlight({ frame: 40, nodeId: "a", traversal: beats }), 1);
  assert.equal(nodeHighlight({ frame: 80, nodeId: "a", traversal: beats }), 0);
  assert.equal(nodeHighlight({ frame: 80, nodeId: "b", traversal: beats }), 1);
  assert.equal(edgeHighlight({ frame: 59, edge, traversal: beats }), 0);
  assert.equal(edgeHighlight({ frame: 100, edge, traversal: beats }), 1);
  assert.equal(nodeHighlight({ frame: 40, nodeId: "a", traversal: beats }), 1);
  assert.throws(() => {
    return validateGraph(nodes, [{ ...edge, to: "missing" }]);
  }, /Invalid graph edge/);
  assert.throws(() => {
    return validateGraph([...nodes, nodes[0]], []);
  }, /Duplicate/);
  assert.throws(() => {
    return validateGraph(nodes, [edge], [...beats].reverse());
  }, /increasing/);
});
test("flowchart routes sequential nodes along a serpentine grid without losing input order", () => {
  const steps = Array.from({ length: 6 }, (_, index) => {
    return { id: String(index), label: String(index) };
  });
  const nodes = flowNodes(steps);
  assert.deepEqual(
    nodes.map(({ id }) => {
      return id;
    }),
    steps.map(({ id }) => {
      return id;
    }),
  );
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
    flowNodes(steps.slice(0, 1)).map(({ x, y }) => {
      return [x, y];
    }),
    [[0.5, 0.5]],
  );
  assert.throws(() => {
    return flowNodes([]);
  }, /1 to 6/);
});
test("metric formatting preserves fractional values, negatives, grouping, and zero", () => {
  assert.equal(formatMetric(12345.678, 2), "12,345.68");
  assert.equal(formatMetric(-12.5, 1), "-12.5");
  assert.equal(formatMetric(-0.001, 2), "0.00");
  assert.equal(formatMetric(0), "0");
  assert.throws(() => {
    return formatMetric(Infinity);
  }, /finite/);
  assert.throws(() => {
    return formatMetric(1, 7);
  }, /precision/);
});
test("metric fitting reserves the complete stack on a compact captioned canvas", () => {
  const bounds = sceneBounds(
    1600,
    800 - captionBand([{ text: "A short cue." }], 1600, 800),
    true,
  );
  const content = {
    label: "Reported households requiring an additional response contact",
    value: 240,
    detail:
      "Records include households awaiting contact and reported needs across all fictional districts.",
  };
  const fit = fitMetricContent({ ...bounds, ...content });
  const required =
    fit.label.lines.length * fit.label.fontSize * 1.22 +
    fit.numberHeight +
    fit.numberGap * 2 +
    fit.detail!.lines.length * fit.detail!.fontSize * 1.3 +
    fit.paddingY * 2 +
    2;
  assert.equal(bounds.height, 322);
  assert.ok(
    required <= bounds.height,
    `Metric stack needs ${required}px inside ${bounds.height}px`,
  );
  assert.ok(
    fit.label.fontSize >= 28 &&
      fit.detail!.fontSize >= 20 &&
      fit.numberSize >= 48,
  );
  assert.deepEqual(
    fit,
    fitMetricContent({ ...bounds, ...content }),
    "Sizing depends on complete content, never the current counter frame",
  );
  const withUnit = fitMetricContent({
    ...bounds,
    ...content,
    unit: "households",
    from: -125.5,
    precision: 1,
  });
  assert.ok(
    withUnit.requiredHeight <= bounds.height && withUnit.unitSize >= 28,
  );
  assert.throws(() => {
    return fitMetricContent({ ...bounds, ...content, height: 100 });
  }, /cannot fit legibly/);
});
test("metric fitting preserves the spacious layout when the whole stack fits", () => {
  const bounds = sceneBounds(1600, 840, true);
  const fit = fitMetricContent({
    ...bounds,
    label: "Fictional cases in the bundle",
    value: 240,
    detail: "Generated deterministically across six districts",
  });
  assert.equal(fit.numberSize, 154);
  assert.equal(fit.label.fontSize, 42);
  assert.equal(fit.detail!.fontSize, 28);
  assert.equal(fit.paddingY, 50);
  assert.equal(fit.numberGap, 28);
});
test("typography wraps at word boundaries and resolves a stable readable size", () => {
  const fit = fitTextLines(
    [
      "A clear explanation stays readable across the whole canvas",
      "Every word has a purpose",
    ],
    1000,
    400,
    92,
  );
  assert.ok(fit.fontSize >= 40 && fit.fontSize <= 92);
  assert.ok(fit.lines.length * fit.fontSize * 1.22 <= 400);
  assert.equal(
    fit.lines.join(" "),
    "A clear explanation stays readable across the whole canvas Every word has a purpose",
  );
  fit.lines.forEach((line) => {
    return assert.ok(textUnits(line) * fit.fontSize <= 1000);
  });
  assert.throws(() => {
    return fitTextLines(["W".repeat(100)], 200, 300, 92);
  }, /cannot fit legibly/);
});
test("media accepts only public-relative assets and crop rectangles inside the viewport", () => {
  assert.equal(
    safePublicPath("captures/demo/screen 01.png"),
    "captures/demo/screen 01.png",
  );
  for (const path of [
    "https://example.com/a.png",
    "//example.com/a.png",
    "/tmp/a.png",
    "../secret",
    "a/../secret",
    "a/%2e%2e/secret",
    "a\\secret",
    "a.png?token=123",
    "a.png#anchor",
    "data:image/png,abc",
  ]) {
    assert.throws(() => {
      return safePublicPath(path);
    }, /public-relative/);
  }
  assertRect({ x: 0.2, y: 0.1, width: 0.8, height: 0.9 }, "crop");
  assert.throws(() => {
    return assertRect({ x: 0.8, y: 0, width: 0.3, height: 1 }, "crop");
  }, /inside/);
  assert.throws(() => {
    return assertRect({ x: 0, y: 0, width: 0, height: 1 }, "crop");
  }, /nonempty/);
});
test("captions use exact half-open cue boundaries and reject overlap or duplicate ids", () => {
  const cues: CaptionCue[] = [
    { id: "a", startFrame: 10, endFrame: 40, text: "First cue" },
    { id: "b", startFrame: 40, endFrame: 80, text: "Second cue" },
  ];
  validateCaptions(cues);
  assert.equal(activeCaption(9, cues), undefined);
  assert.equal(activeCaption(10, cues)?.id, "a");
  assert.equal(activeCaption(39, cues)?.id, "a");
  assert.equal(activeCaption(40, cues)?.id, "b");
  assert.equal(activeCaption(80, cues), undefined);
  assert.throws(() => {
    return validateCaptions([{ ...cues[0], endFrame: 41 }, cues[1]]);
  }, /overlap/);
  assert.throws(() => {
    return validateCaptions([cues[0], { ...cues[1], id: "a" }]);
  }, /Duplicate/);
});
test("the tallest caption reserves its full box, inset and clearance without resizing the scene", () => {
  // 180 characters is long enough to force the caption onto its tallest
  // wrapped layout (>= 3 lines) at this canvas width, which is the boundary
  // this test exercises.
  const text =
    "These fictional cases connect to visits, facilities, and districts so teams can inspect source records, compare reported needs, and see which households are still awaiting contact.";
  const long = captionGeometry({ text, width: 1600, height: 1000 });
  assert.ok(long.lines.length >= 3);
  assert.equal(long.fontSize, 38);
  const band = captionBand([{ text: "Short cue." }, { text }], 1600, 1000);
  const sceneBottom = 1000 - band;
  const captionTop = 1000 - long.bottom - long.boxHeight;
  assert.ok(captionTop - sceneBottom >= long.clearance);
  assert.ok(sceneBottom >= 640);
  assert.equal(
    band,
    captionBand([{ text }, { text: "Short cue." }], 1600, 1000),
  );
  assert.equal(captionBand([], 1600, 1000), 0);
  assert.equal(captionBand([{ text: "Short cue." }], 1600, 1000), 160);
});
test("a packet travels its edge only during its window, in its direction", () => {
  const start = { x: 0, y: 0 };
  const end = { x: 100, y: 0 };
  const packets = [
    { atFrame: 10, durationInFrames: 10 },
    { atFrame: 30, durationInFrames: 10, direction: "reverse" as const },
  ];
  assert.deepEqual(getPacketPositions({ frame: 5, packets, start, end }), []);
  const forward = getPacketPositions({ frame: 15, packets, start, end });
  assert.equal(forward.length, 1);
  assert.ok(forward[0].x > 0 && forward[0].x < 100);
  const reverse = getPacketPositions({ frame: 33, packets, start, end });
  assert.ok(reverse[0].x > 50, "a reverse packet starts at the far end");
  assert.deepEqual(getPacketPositions({ frame: 45, packets, start, end }), []);
});
test("parallel edges with offsets stay apart and still meet both card borders", () => {
  const a = { x: 0, y: 0, width: 100, height: 120 };
  const b = { x: 300, y: 0, width: 100, height: 120 };
  const upper = offsetEdgeEndpoints(a, b, -0.5);
  const lower = offsetEdgeEndpoints(a, b, 0.5);
  assert.ok(upper.start.y < 60 && lower.start.y > 60);
  assert.equal(upper.start.x, 100);
  assert.equal(lower.end.x, 300);
});
test("a wide node with list items is taller than its label alone", () => {
  const bounds = sceneBounds(1920, 1080, true);
  const plain = graphNodeRect({ id: "n", label: "Core", x: 0, y: 0.5 }, bounds);
  const listed = graphNodeRect(
    {
      id: "n",
      label: "Core",
      x: 0,
      y: 0.5,
      width: 0.4,
      items: ["a", "b", "c", "d", "e", "f"],
    },
    bounds,
  );
  assert.equal(listed.width, bounds.width * 0.4);
  assert.ok(listed.height > plain.height);
});
