import "./helpers/registerCssModuleStub";
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { Children, createElement, Fragment, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import acceptedAdditions from "../docs/motion-atlas/catalog-expansion.json";
import {
  STOCK_CATALOG,
  STOCK_CATEGORIES,
  STOCK_FPS,
  STOCK_IDS,
  STOCK_LOOP_FRAMES,
  stockEntry,
} from "../src/stock/catalog";
import { DECISION_FORK_DENSE_INPUT } from "../src/stock/presets/DecisionFork/DecisionFork.fixtures";
import { StockCompositions } from "../src/stock/StockCompositions";
import { StockGraphic } from "../src/stock/StockGraphic";
import { storyboardSchema } from "../src/storyboard/schema/schema";

const { ShotView } = await import("../src/storyboard/StoryFilm/ShotView");
import { LEGACY_IDS } from "./fixtures/legacyStockIds";
import { getSvgAttributeMatchesFromMarkup } from "./helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import type { StockRequest } from "../src/stock/contracts/StockContract.types";
import type { ResolvedStockRequest } from "../src/stock/contracts/stockRequestSchema/stockRequestSchema";

test("all catalogue entries have unique stable references and six-second loops", () => {
  assert.deepEqual(
    new Set(STOCK_IDS),
    new Set([...LEGACY_IDS, ...acceptedAdditions.map(prop("id"))]),
  );
  assert.equal(
    STOCK_CATALOG.filter(({ collection }) => collection === "general").length,
    106,
  );
  assert.equal(
    STOCK_CATALOG.filter(({ collection }) => collection === "social-sector")
      .length,
    64,
  );
  assert.equal(new Set(STOCK_IDS).size, STOCK_IDS.length);
  assert.deepEqual(
    STOCK_CATALOG.map(({ id }) => id),
    [...STOCK_IDS],
  );
  assert.equal(
    new Set(STOCK_CATALOG.map(({ id }) => id)).size,
    STOCK_CATALOG.length,
  );
  assert.deepEqual(
    new Set(STOCK_CATALOG.map(({ category }) => category)),
    new Set(STOCK_CATEGORIES),
  );
  assert.equal(STOCK_LOOP_FRAMES / STOCK_FPS, 6);
  for (const entry of STOCK_CATALOG) {
    assert.equal(stockEntry(entry.id), entry);
    assert.match(entry.id, /^[a-z][a-z0-9-]*$/);
    assert.equal(entry.loopFrames, STOCK_LOOP_FRAMES);
    assert.ok(
      entry.name.trim() && entry.description.trim() && entry.useWhen.trim(),
    );
    assert.ok(entry.tags.length > 0);
    assert.ok(
      !([...LEGACY_IDS, "decision-fork"] as string[]).includes(entry.id) ||
        entry.prompt.includes(entry.id),
      `${entry.id} brief must retain a reusable preset reference`,
    );
  }
  assert.throws(
    () => stockEntry("unknown-preset"),
    /Unknown stock motion preset/,
  );
});

function _stockPlan(props: Record<string, unknown>) {
  return {
    version: 1,
    id: "stock-test",
    title: "Stock fixture",
    description: "Conceptual test graphic",
    sourceNotes: ["Fictional demonstration data"],
    purpose: "standalone",
    fps: STOCK_FPS,
    width: 1280,
    height: 800,
    delivery: { width: 1280, height: 800 },
    shots: [
      {
        id: "motion",
        scene: "stock",
        durationInFrames: STOCK_LOOP_FRAMES,
        props,
      },
    ],
  };
}

test("stock storyboards accept every catalogue preset and only safe explicit props", () => {
  assert.equal(
    storyboardSchema.safeParse(_stockPlan({ preset: "network-graph" })).success,
    true,
  );
  for (const preset of STOCK_IDS) {
    const plan = storyboardSchema.parse(
      _stockPlan({
        preset,
        accent: "#91e7c4",
        title: "Conceptual motion",
        kicker: "Fictional sample",
      }),
    );
    assert.equal(plan.shots[0].scene, "stock");
    if (plan.shots[0].scene === "stock")
      assert.equal(plan.shots[0].props.preset, preset);
  }
  for (const props of [
    { preset: "unknown-preset" },
    {},
    { preset: "network-graph", customData: [] },
    ...[
      "url(https://example.com/paint.svg)",
      "var(--accent)",
      "#fff",
      "#11223344",
      "red",
      "#12345g",
      "#91e7c4;opacity:0",
    ].map((accent) => ({ preset: "network-graph", accent })),
  ])
    assert.equal(
      storyboardSchema.safeParse(_stockPlan(props)).success,
      false,
      JSON.stringify(props),
    );
  const extraShotField = _stockPlan({ preset: "network-graph" });
  assert.equal(
    storyboardSchema.safeParse({
      ...extraShotField,
      shots: [{ ...extraShotField.shots[0], unknown: true }],
    }).success,
    false,
  );
});

test("every stock renderer produces finite deterministic SVG under random frame access", () => {
  // Every preset accepts omitted input. The large discriminated union cannot
  // distribute a dynamic ID at this no-input call site without this narrow
  // cast.
  const frames = [90, 0, 179, 18, 138, 45, 1, 167, 178, 180, -1];
  for (const preset of STOCK_IDS) {
    for (const frame of frames) {
      const render = () =>
        renderToStaticMarkup(
          createElement(StockGraphic, {
            ...({ preset } as StockRequest),
            frame,
          }),
        );
      const markup = render();
      assert.match(markup, /^<svg\b/);
      assert.match(markup, /<\/svg>$/);
      assert.doesNotMatch(
        markup,
        /NaN|Infinity|undefined/,
        `${preset} at frame ${frame}`,
      );
      assert.ok(
        (markup.match(/<(?:path|circle|rect|line|text)\b/g) ?? []).length > 3,
        `${preset} must render its graphic`,
      );
      assert.equal(
        render(),
        markup,
        `${preset} changes when seeking to the same frame`,
      );
    }
  }
});

test("SVG masks and gradients remain local when cards and previews share a page", () => {
  const markup = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      ...[0, 1].flatMap((copy) =>
        STOCK_IDS.map((preset) =>
          createElement(StockGraphic, {
            key: `${copy}-${preset}`,
            ...({ preset } as StockRequest),
            frame: copy ? 70 : 120,
            accent: copy ? "#b4b8ff" : "#9fefca",
          }),
        ),
      ),
    ),
  );
  const ids = getSvgAttributeMatchesFromMarkup({
    markup,
    attribute: "id",
  }).values;
  assert.ok(ids.length > 0, "Exercise real SVG definitions");
  assert.equal(
    new Set(ids).size,
    ids.length,
    "Every instance must own unique definition IDs",
  );
  const svgs = [...markup.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(
    (match) => match[0],
  );
  assert.equal(svgs.length, STOCK_IDS.length * 2);
  let references = 0;
  for (const svg of svgs) {
    const localIds = new Set(
      getSvgAttributeMatchesFromMarkup({ markup: svg, attribute: "id" }).values,
    );
    for (const match of svg.matchAll(/url\(#([^)]+)\)/g)) {
      references++;
      assert.ok(
        localIds.has(match[1]),
        `SVG references a missing or foreign definition: ${match[1]}`,
      );
    }
    for (const match of svg.matchAll(
      /aria-(?:labelledby|describedby)="([^"]+)"/g,
    )) {
      for (const id of match[1].split(/\s+/))
        assert.ok(
          localIds.has(id),
          `SVG accessibility reference is missing: ${id}`,
        );
    }
  }
  assert.ok(
    references > 0,
    "Exercise rendered gradient and clipping references",
  );
});

test("configured stock storyboards retain complete content and palette", () => {
  const plan = storyboardSchema.parse(
    _stockPlan({
      preset: "decision-fork",
      schemaVersion: 1,
      input: DECISION_FORK_DENSE_INPUT,
      accent: "#aabbcc",
      background: "#112233",
    }),
  );
  assert.deepEqual(plan.shots[0].props, {
    preset: "decision-fork",
    schemaVersion: 1,
    input: DECISION_FORK_DENSE_INPUT,
    accent: "#aabbcc",
    background: "#112233",
  });
});

test("stock storyboards reject dangling branch references and extra input keys", () => {
  Array.from([
    { ...DECISION_FORK_DENSE_INPUT, selectedBranchId: "missing" },
    { ...DECISION_FORK_DENSE_INPUT, unexpected: true },
    { prompt: "Partial input" },
  ]).forEach((input) => {
    assert.equal(
      storyboardSchema.safeParse(_stockPlan({ preset: "decision-fork", input }))
        .success,
      false,
    );
  });
});

test("storyboard rendering preserves configured content, heading space and cycle modulo", () => {
  const plan = storyboardSchema.parse(
    _stockPlan({
      preset: "decision-fork",
      schemaVersion: 1,
      input: DECISION_FORK_DENSE_INPUT,
      title: "Authored heading",
      accent: "#aabbcc",
      background: "#112233",
    }),
  );
  const render = ({ frame }: Readonly<{ frame: number }>) =>
    renderToStaticMarkup(
      createElement(ShotView, {
        shot: plan.shots[0],
        frame,
        width: 1280,
        height: 800,
      }),
    );
  const markup = render({ frame: 150 });
  assert.match(markup, /Authored heading/);
  assert.match(markup, /Return to the notebook/);
  assert.match(markup, /#112233/);
  assert.match(markup, /width="1280" height="600"/);
  assert.equal(markup, render({ frame: 330 }));
});

test("standalone stock frames keep the existing clamp at both boundaries", () => {
  const render = ({ frame }: Readonly<{ frame: number }>) =>
    renderToStaticMarkup(
      createElement(StockGraphic, { preset: "decision-fork", frame }),
    );
  assert.equal(render({ frame: -15 }), render({ frame: 0 }));
  assert.equal(render({ frame: 180 }), render({ frame: 179 }));
  assert.equal(render({ frame: Infinity }), render({ frame: 0 }));
});

test("composition metadata validates complete replacements after top-level prop resolution", () => {
  type Registration = {
    id: string;
    defaultProps: StockRequest;
    calculateMetadata: (options: { props: unknown }) => {
      props: ResolvedStockRequest;
    };
  };
  const elements = Children.toArray(StockCompositions().props.children);
  const registrations = elements.filter(isValidElement<Registration>);
  const decision = registrations.find(
    propEq("props.id", "stock-decision-fork"),
  );
  assert.ok(decision);
  const defaults = decision.props.defaultProps;
  assert.equal(defaults.schemaVersion, 1);
  assert.ok(defaults.input);
  assert.equal(defaults.accent, "#9fefca");
  assert.equal(defaults.background, "#0b1219");
  const input = structuredClone(DECISION_FORK_DENSE_INPUT);
  input.branches[1].outcome = "Composition chosen";
  const { props } = decision.props.calculateMetadata({
    props: { ...defaults, input, accent: "#aabbcc", background: "#112233" },
  });
  assert.deepEqual(props.input, input);
  assert.equal(props.accent, "#aabbcc");
  assert.equal(props.background, "#112233");
  assert.throws(
    () =>
      decision.props.calculateMetadata({
        props: { ...defaults, input: { prompt: "Incomplete replacement" } },
      }),
    /branches/,
  );
});
