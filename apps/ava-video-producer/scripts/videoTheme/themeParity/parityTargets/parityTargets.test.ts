import assert from "node:assert/strict";
import test from "node:test";
import { CONTINUITY_CATALOG } from "../../../../src/continuity/continuityCatalog";
import { STOCK_IDS } from "../../../../src/stock/catalog";
import {
  getAllowedRegionsFromFilm,
  listAllParityTargets,
  listParityTargets,
} from "./parityTargets";

test("the default parity targets are the fast base list", () => {
  assert.deepEqual(
    listParityTargets().map((target) => {
      return target.filmId;
    }),
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
    getAllowedRegionsFromFilm("node-traversal", {
      kind: "stock",
      width: 1280,
      height: 800,
    }),
    [{ x: 0, y: 693, width: 1280, height: 94 }],
  );
});

test("a target without a listed consolidation has no allowed regions", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("network-graph", {
      kind: "stock",
      width: 1280,
      height: 800,
    }),
    [],
  );
});

test("unknown parity ids are rejected", () => {
  assert.throws(() => {
    return listParityTargets(["not-a-preset"]);
  });
});

test("any Atlas motion or composition can be named before it is covered", () => {
  assert.deepEqual(
    listParityTargets(["person-led-support-calendar", "brand-lockup"]).map(
      (target) => {
        return target.filmId;
      },
    ),
    ["stock-person-led-support-calendar", "brand-lockup"],
  );
});

test("a composition captured on the oklch palette may differ by one level and no more", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("brand-lockup", {
      kind: "storyboard",
      width: 1600,
      height: 1000,
    }),
    [{ x: 0, y: 0, width: 1600, height: 1000, maxChannelDelta: 1 }],
  );
});

test("a composition with no starter allowance must match exactly", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("fly-through", {
      kind: "storyboard",
      width: 1600,
      height: 1000,
    }),
    [],
  );
});

test("--all covers every Atlas motion, composition, sample film, and fixed film", () => {
  const filmIds = listAllParityTargets().map((target) => {
    return target.filmId;
  });
  assert.equal(new Set(filmIds).size, filmIds.length);
  assert.deepEqual(
    [...filmIds].sort(),
    [
      ...STOCK_IDS.map((id) => {
        return `stock-${id}`;
      }),
      ...CONTINUITY_CATALOG.map((entry) => {
        return entry.id;
      }),
      "title-study",
      "motion-lab",
    ].sort(),
  );
});
