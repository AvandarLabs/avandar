import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseMotionArgs } from "../scripts/motion";
import { loopEnvelope, loopPhase, wave } from "../src/motion";
import {
  STOCK_CATALOG,
  STOCK_CATEGORIES,
  STOCK_FPS,
  STOCK_IDS,
  STOCK_LOOP_FRAMES,
  stockEntry,
} from "../src/stock/catalog";
import { StockGraphic } from "../src/stock/StockGraphic";
import { storyboardSchema } from "../src/storyboard/schema/schema";

test("loop motion is bounded, periodic, and deterministic under out-of-order seeks", () => {
  const frames = [-361, -180, -1, 0, 1, 45, 90, 179, 180, 361];
  for (const offset of [-28, 0, 37]) {
    const values = frames.map((frame) => [
      loopPhase(frame, 180, offset),
      wave(frame, 180, offset),
    ]);
    for (const frame of [...frames].reverse()) {
      const phase = loopPhase(frame, 180, offset);
      const pulse = wave(frame, 180, offset);
      assert.ok(phase >= 0 && phase < 1);
      assert.ok(pulse >= 0 && pulse <= 1);
      assert.equal(phase, loopPhase(frame + 180, 180, offset));
      assert.equal(pulse, wave(frame + 180, 180, offset));
      assert.deepEqual([phase, pulse], values[frames.indexOf(frame)]);
    }
  }
  assert.equal(loopPhase(-45, 180), 0.75);
  assert.equal(loopPhase(37, 180, 37), 0);
  assert.equal(wave(0, 180), 0);
  assert.equal(wave(90, 180), 1);
});

test("loop envelopes preserve a full reading hold and meet the same boundary ground", () => {
  assert.equal(loopEnvelope(0, 180), 0);
  assert.equal(loopEnvelope(179, 180), 0);
  assert.equal(loopEnvelope(-1, 180), 0);
  assert.equal(loopEnvelope(180, 180), 0);
  for (let frame = 0; frame < 180; frame++) {
    const opacity = loopEnvelope(frame, 180);
    assert.ok(
      opacity >= 0 && opacity <= 1,
      `Invalid envelope opacity at ${frame}`,
    );
    if (frame >= 12 && frame <= 167) assert.equal(opacity, 1);
  }
  assert.ok(loopEnvelope(1, 180) < loopEnvelope(6, 180));
  assert.ok(loopEnvelope(173, 180) > loopEnvelope(178, 180));
});

test("loop helpers reject invalid timing before it reaches SVG geometry", () => {
  for (const helper of [loopPhase, wave]) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(() => helper(value, 180));
      assert.throws(() => helper(30, value));
      assert.throws(() => helper(30, 180, value));
    }
    for (const period of [0, -180]) assert.throws(() => helper(30, period));
  }
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => loopEnvelope(value, 180));
    assert.throws(() => loopEnvelope(30, value));
    assert.throws(() => loopEnvelope(30, 180, value));
  }
  for (const [duration, fade] of [
    [0, 12],
    [1, 12],
    [24, 12],
    [180, 0],
    [180, -1],
    [180, 90],
  ]) {
    assert.throws(() => loopEnvelope(30, duration, fade));
  }
});

test("all twenty catalogue entries have unique stable references and six-second loops", () => {
  assert.equal(STOCK_CATALOG.length, 20);
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
      entry.prompt.includes(entry.id),
      `${entry.id} brief must retain a reusable preset reference`,
    );
  }
  assert.throws(
    () => stockEntry("unknown-preset"),
    /Unknown stock motion preset/,
  );
});

function stockPlan(props: Record<string, unknown>) {
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
    storyboardSchema.safeParse(stockPlan({ preset: "network-graph" })).success,
    true,
  );
  for (const preset of STOCK_IDS) {
    const plan = storyboardSchema.parse(
      stockPlan({
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
      storyboardSchema.safeParse(stockPlan(props)).success,
      false,
      JSON.stringify(props),
    );
  const extraShotField = stockPlan({ preset: "network-graph" });
  assert.equal(
    storyboardSchema.safeParse({
      ...extraShotField,
      shots: [{ ...extraShotField.shots[0], unknown: true }],
    }).success,
    false,
  );
});

test("motion CLI resolves stable presets and rejects unrecognized commands or selections", () => {
  assert.deepEqual(
    parseMotionArgs(["list"]).entries.map(({ id }) => id),
    [...STOCK_IDS],
  );
  for (const command of ["preview", "render"]) {
    assert.equal(
      parseMotionArgs([command, "all"]).entries.length,
      STOCK_CATALOG.length,
    );
    assert.deepEqual(
      parseMotionArgs([command, "network-graph"]).entries.map(({ id }) => id),
      ["network-graph"],
    );
  }
  for (const args of [
    [],
    ["unknown"],
    ["render", "unknown-preset"],
    ["render", "../outside"],
    ["preview", "all", "extra"],
  ]) {
    assert.throws(
      () => parseMotionArgs(args),
      /Usage|Unknown stock motion preset/,
    );
  }
});

test("every stock renderer produces finite deterministic SVG under random frame access", () => {
  const frames = [90, 0, 179, 18, 138, 45, 1, 167, 178, 180, -1];
  for (const preset of STOCK_IDS) {
    for (const frame of frames) {
      const render = () =>
        renderToStaticMarkup(createElement(StockGraphic, { preset, frame }));
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
            preset,
            frame: copy ? 70 : 120,
            accent: copy ? "#b4b8ff" : "#9fefca",
          }),
        ),
      ),
    ),
  );
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
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
      [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
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
