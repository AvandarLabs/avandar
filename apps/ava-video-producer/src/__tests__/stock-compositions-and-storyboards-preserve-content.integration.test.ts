import "../../tests/helpers/registerCssModuleStub";
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { Children, createElement, Fragment, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import acceptedAdditions from "../../docs/motion-atlas/catalog-expansion.json";
import { LEGACY_IDS } from "../../tests/fixtures/legacyStockIds";
import { getSvgAttributeMatchesFromMarkup } from "../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { DECISION_FORK_DENSE_INPUT } from "../stock/presets/DecisionFork/DecisionFork.fixtures";
import { StockCompositions } from "../stock/StockCompositions";
import {
  STOCK_CATALOG,
  STOCK_CATEGORIES,
  STOCK_FPS,
  STOCK_IDS,
  STOCK_LOOP_FRAMES,
  stockEntry,
} from "../stock/stockEntry";
import { StockGraphic } from "../stock/StockGraphic/StockGraphic";
import { storyboardSchema } from "../storyboard/schema/schema";
import { VideoThemeScope } from "../videoTheme/VideoThemeScope/VideoThemeScope";
import type { StockRequest } from "../stock/contracts/StockContract.types";
import type { ResolvedStockRequest } from "../stock/contracts/stockRequestSchema/stockRequestSchema";

const { ShotView } = await import("../storyboard/StoryFilm/ShotView");

test("all catalogue entries have unique stable references and six-second loops", () => {
  assert.deepEqual(
    new Set(STOCK_IDS),
    new Set([...LEGACY_IDS, ...acceptedAdditions.map(prop("id"))]),
  );
  assert.equal(
    STOCK_CATALOG.filter(propEq("collection", "general")).length,
    106,
  );
  assert.equal(
    STOCK_CATALOG.filter(propEq("collection", "social-sector")).length,
    64,
  );
  assert.equal(new Set(STOCK_IDS).size, STOCK_IDS.length);
  assert.deepEqual(STOCK_CATALOG.map(prop("id")), [...STOCK_IDS]);
  assert.equal(
    new Set(STOCK_CATALOG.map(prop("id"))).size,
    STOCK_CATALOG.length,
  );
  assert.deepEqual(
    new Set(STOCK_CATALOG.map(prop("category"))),
    new Set(STOCK_CATEGORIES),
  );
  assert.equal(STOCK_LOOP_FRAMES / STOCK_FPS, 6);
  Array.from(STOCK_CATALOG).forEach((entry) => {
    assert.equal(stockEntry(entry.id), entry);
    assert.match(entry.id, /^[a-z][a-z0-9-]*$/);
    assert.equal(entry.loopFrames, STOCK_LOOP_FRAMES);
    assert.ok(
      entry.name.trim() && entry.description.trim() && entry.useWhen.trim(),
    );
    assert.ok(entry.tags.length > 0);
    assert.ok(
      ![...LEGACY_IDS, "decision-fork"].includes(entry.id) ||
        entry.prompt.includes(entry.id),
      `${entry.id} brief must retain a reusable preset reference`,
    );
  });
  assert.throws(() => {
    return stockEntry("unknown-preset");
  }, /Unknown stock motion preset/);
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
  _assertCatalogPresetStoryboards();
  [
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
    ].map((accent) => {
      return { preset: "network-graph", accent };
    }),
  ].forEach((props) => {
    assert.equal(
      storyboardSchema.safeParse(_stockPlan(props)).success,
      false,
      JSON.stringify(props),
    );
  });
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
  STOCK_IDS.forEach((preset) => {
    frames.forEach((frame) => {
      const render = () => {
        return renderToStaticMarkup(
          createElement(StockGraphic, {
            ...({ preset } as StockRequest),
            frame,
          }),
        );
      };
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
    });
  });
});

test("SVG masks and gradients remain local when cards and previews share a page", () => {
  const { markup } = _renderPairedStockCards();
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
  const svgs = [...markup.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((match) => {
    return match[0];
  });
  assert.equal(svgs.length, STOCK_IDS.length * 2);
  let references = 0;
  svgs.forEach((svg) => {
    const localIds = new Set(
      getSvgAttributeMatchesFromMarkup({ markup: svg, attribute: "id" }).values,
    );
    Array.from(svg.matchAll(/url\(#([^)]+)\)/g)).forEach((match) => {
      references++;
      assert.ok(
        localIds.has(match[1]),
        `SVG references a missing or foreign definition: ${match[1]}`,
      );
    });
    Array.from(
      svg.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g),
    ).forEach((match) => {
      match[1].split(/\s+/).forEach((id) => {
        assert.ok(
          localIds.has(id),
          `SVG accessibility reference is missing: ${id}`,
        );
      });
    });
  });
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
  const render = ({ frame }: Readonly<{ frame: number }>) => {
    // StoryFilm supplies the theme scenes read; a bare shot needs its own.
    return renderToStaticMarkup(
      createElement(
        VideoThemeScope,
        null,
        createElement(ShotView, {
          shot: plan.shots[0],
          frame,
          width: 1280,
          height: 800,
        }),
      ),
    );
  };
  const markup = render({ frame: 150 });
  assert.match(markup, /Authored heading/);
  assert.match(markup, /Return to the notebook/);
  assert.match(markup, /#112233/);
  assert.match(markup, /width="1280" height="600"/);
  assert.equal(markup, render({ frame: 330 }));
});

test("standalone stock frames keep the existing clamp at both boundaries", () => {
  const render = ({ frame }: Readonly<{ frame: number }>) => {
    return renderToStaticMarkup(
      createElement(StockGraphic, { preset: "decision-fork", frame }),
    );
  };
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
  // No default colours: the composition's theme decides them.
  assert.equal(defaults.accent, undefined);
  assert.equal(defaults.background, undefined);
  const input = structuredClone(DECISION_FORK_DENSE_INPUT);
  input.branches[1].outcome = "Composition chosen";
  const { props } = decision.props.calculateMetadata({
    props: { ...defaults, input, accent: "#aabbcc", background: "#112233" },
  });
  assert.deepEqual(props.input, input);
  assert.equal(props.accent, "#aabbcc");
  assert.equal(props.background, "#112233");
  assert.throws(() => {
    return decision.props.calculateMetadata({
      props: { ...defaults, input: { prompt: "Incomplete replacement" } },
    });
  }, /branches/);
});

function _renderPairedStockCards(): Readonly<{ markup: string }> {
  const markup = renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      ...[0, 1].flatMap((copy) => {
        return STOCK_IDS.map((preset) => {
          return createElement(StockGraphic, {
            key: `${copy}-${preset}`,
            ...({ preset } as StockRequest),
            frame: copy ? 70 : 120,
            accent: copy ? "#b4b8ff" : "#9fefca",
          });
        });
      }),
    ),
  );
  return { markup };
}

function _assertCatalogPresetStoryboards(): void {
  Array.from(STOCK_IDS).forEach((preset) => {
    const plan = storyboardSchema.parse(
      _stockPlan({
        preset,
        accent: "#91e7c4",
        title: "Conceptual motion",
        kicker: "Fictional sample",
      }),
    );
    assert.equal(plan.shots[0].scene, "stock");
    if (plan.shots[0].scene === "stock") {
      assert.equal(plan.shots[0].props.preset, preset);
    }
  });
}
