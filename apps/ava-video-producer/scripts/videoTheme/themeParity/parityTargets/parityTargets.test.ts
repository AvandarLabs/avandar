import assert from "node:assert/strict";
import test from "node:test";
import { getAllowedRegionsFromFilm, listParityTargets } from "./parityTargets";

test("every in-scope preset and composition is a parity target", () => {
  assert.deepEqual(
    listParityTargets().map((target) => target.filmId),
    [
      "stock-network-graph",
      "stock-node-traversal",
      "stock-radial-network",
      "stock-plexus-field",
      "stock-orbital-system",
      "stock-data-pipeline",
      "stock-predicate-pushdown-boundary",
      "stock-code-focus",
      "stock-schema-mapping",
      "stock-query-column-cache-growth",
      "stock-source-merge",
      "stock-decision-fork",
      "shared-object-handoff",
      "frame-to-interface",
      "aperture-detail",
      "spatial-continuation",
      "occlusion-wipe",
    ],
  );
});

test("stock targets render at the Atlas gallery default colours", () => {
  const [networkGraph] = listParityTargets(["network-graph"]);
  assert.deepEqual(networkGraph.options, {
    accent: "#51a7ff",
    background: "#0b1219",
  });
});

test("caption allowances scale from the stock viewBox to the rendered frame", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("node-traversal", { kind: "stock", width: 1280 }),
    [{ x: 0, y: 693, width: 1280, height: 94 }],
  );
});

test("a target without a listed consolidation has no allowed regions", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("network-graph", { kind: "stock", width: 1280 }),
    [],
  );
});

test("unknown parity ids are rejected", () => {
  assert.throws(() => listParityTargets(["not-a-preset"]));
});
