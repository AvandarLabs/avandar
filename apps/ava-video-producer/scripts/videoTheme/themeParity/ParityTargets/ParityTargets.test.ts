import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { CONTINUITY_CATALOG } from "../../../../src/continuity/continuityCatalog";
import { STOCK_IDS } from "../../../../src/stock/catalog";
import { ParityTargets } from "./ParityTargets";

test("the default parity targets are the fast base list", () => {
  assert.deepEqual(ParityTargets.listParityTargets().map(prop("filmId")), [
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
  ]);
});
test("stock targets render at the Atlas gallery default colours", () => {
  const [networkGraph] = ParityTargets.listParityTargets(["network-graph"]);
  assert.deepEqual(networkGraph.options, {
    accent: "#51a7ff",
    background: "#0b1219",
  });
});
test("caption allowances scale from the stock viewBox to the rendered frame", () => {
  assert.deepEqual(
    ParityTargets.getAllowedRegionsFromFilm({
      id: "node-traversal",
      film: { kind: "stock", width: 1280, height: 800 },
    }),
    [{ x: 0, y: 693, width: 1280, height: 94 }],
  );
});
test("a target without a listed consolidation has no allowed regions", () => {
  assert.deepEqual(
    ParityTargets.getAllowedRegionsFromFilm({
      id: "network-graph",
      film: { kind: "stock", width: 1280, height: 800 },
    }),
    [],
  );
});
test("unknown parity ids are rejected", () => {
  assert.throws(() => {
    return ParityTargets.listParityTargets(["not-a-preset"]);
  });
});
test("any Atlas motion or composition can be named before it is covered", () => {
  assert.deepEqual(
    ParityTargets.listParityTargets([
      "person-led-support-calendar",
      "brand-lockup",
    ]).map(prop("filmId")),
    ["stock-person-led-support-calendar", "brand-lockup"],
  );
});
test("a composition captured on the oklch palette may differ by one level and no more", () => {
  assert.deepEqual(
    ParityTargets.getAllowedRegionsFromFilm({
      id: "brand-lockup",
      film: { kind: "storyboard", width: 1600, height: 1000 },
    }),
    [{ x: 0, y: 0, width: 1600, height: 1000, maxChannelDelta: 1 }],
  );
});
test("a composition with no starter allowance must match exactly", () => {
  assert.deepEqual(
    ParityTargets.getAllowedRegionsFromFilm({
      id: "fly-through",
      film: { kind: "storyboard", width: 1600, height: 1000 },
    }),
    [],
  );
});
test("--all covers every Atlas motion, composition, sample film, and fixed film", () => {
  const filmIds = ParityTargets.listAllParityTargets().map(prop("filmId"));
  assert.equal(new Set(filmIds).size, filmIds.length);
  assert.deepEqual(
    [...filmIds].sort(),
    [
      ...STOCK_IDS.map((id) => {
        return `stock-${id}`;
      }),
      ...CONTINUITY_CATALOG.map(prop("id")),
      "title-study",
      "motion-lab",
    ].sort(),
  );
});
