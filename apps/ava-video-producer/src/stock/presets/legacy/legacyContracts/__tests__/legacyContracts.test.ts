/**
 * Exact legacy samples and authored-content changes exercise distinct
 * contracts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LEGACY_IDS } from "../../../../../../tests/fixtures/legacyStockIds";
import { parseStockInput } from "../../../../contracts/parseStockInput/parseStockInput";
import { stockContracts } from "../../../../registry/stockContracts";
import { stockRenderers } from "../../../../registry/stockRenderers/stockRenderers";
import { StockGraphic } from "../../../../StockGraphic";

const BASELINE: {
  records: Array<{
    preset: (typeof LEGACY_IDS)[number];
    frame: number;
    svg: string;
  }>;
} = JSON.parse(
  readFileSync(new URL("../legacy-default-svg.json", import.meta.url), "utf8"),
) as {
  records: Array<{
    preset: (typeof LEGACY_IDS)[number];
    frame: number;
    svg: string;
  }>;
};

const _normalizeSvgIds = (markup: string): string =>
  markup.replace(/stock-[a-zA-Z0-9_]+(?=-)/g, "stock-ID");

const _render = ({
  preset,
  input,
}: Readonly<{ preset: (typeof LEGACY_IDS)[number]; input: unknown }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      null,
      stockRenderers[preset](
        { frame: 150, accent: "#9fefca", id: "test" },
        input,
      ),
    ),
  );

test("original twenty samples preserve every SVG label and geometry at all sixty gates", () => {
  assert.equal(BASELINE.records.length, 60);
  BASELINE.records.forEach(({ preset, frame, svg }) => {
    const actual = renderToStaticMarkup(
      createElement(StockGraphic, { preset, frame }),
    );
    assert.equal(
      _normalizeSvgIds(actual),
      _normalizeSvgIds(svg),
      `${preset} frame ${frame}`,
    );
  });
});

test("all legacy entries expose complete controls, bindings and changed fixtures", () => {
  LEGACY_IDS.forEach((preset) => {
    const contract = stockContracts[preset];
    assert.ok(contract.controls.length > 0, `${preset} needs controls`);
    assert.ok(contract.bindingExamples.length > 0, `${preset} needs bindings`);
    assert.ok(
      contract.defaultTextPaths.length > 0,
      `${preset} needs copy paths`,
    );
    assert.deepEqual(
      contract.fixtures.map(prop<{ id: string }, "id", string>("id")),
      ["default", "dense", "changed"],
    );
    [...contract.fixtures, ...contract.bindingExamples].forEach(({ input }) => {
      assert.deepEqual(
        parseStockInput({ preset: preset, rawInput: input }),
        input,
      );
      assert.doesNotMatch(
        _render({ preset: preset, input: input }),
        /NaN|Infinity|undefined/,
      );
    });
    const changed = contract.fixtures.find(({ id }) => id === "changed");
    assert.ok(changed);
    assert.notEqual(
      _render({ preset: preset, input: changed.input }),
      _render({ preset: preset, input: contract.defaultInput }),
    );
    assert.throws(() => parseStockInput({ preset: preset, rawInput: {} }));
    assert.throws(() =>
      parseStockInput({
        preset: preset,
        rawInput: { ...contract.defaultInput, unexpected: true },
      }),
    );
  });
});

test("authored graph edges and node labels determine only the supplied network", () => {
  const input = {
    nodes: [
      { x: 200, y: 200, label: "West", detail: "START" },
      { x: 600, y: 300, label: "East", detail: "END" },
    ],
    edges: [[0, 1]],
    showPackets: false,
  };
  const markup = _render({ preset: "network-graph", input: input });
  assert.match(markup, />West</);
  assert.match(markup, />East</);
  assert.match(markup, /M200,200 C380,200 420,300 600,300/);
  assert.doesNotMatch(markup, /Nexus|Alpha/);
  assert.equal((markup.match(/pathLength="1"/g) ?? []).length, 1);
  assert.throws(() =>
    _render({ preset: "network-graph", input: { ...input, edges: [[0, 2]] } }),
  );
});

test("traversal follows authored adjacent edges instead of the default route", () => {
  const input = structuredClone(stockContracts["node-traversal"].defaultInput);
  Object.assign(input, { route: [0, 1, 3, 5, 6], showRouteLabel: false });
  const markup = _render({ preset: "node-traversal", input: input });
  assert.doesNotMatch(markup, /A → C → D → E → G/);
  assert.match(markup, /x1="310" y1="170" x2="502" y2="302"/);
  assert.throws(() =>
    _render({ preset: "node-traversal", input: { ...input, route: [0, 6] } }),
  );
});

test("chart values and collection lengths control bar widths and trace coordinates", () => {
  const bars = structuredClone(stockContracts["bar-race"].defaultInput);
  Object.assign(bars, {
    bars: [
      {
        label: "Authored",
        start: 10,
        end: 25,
        from: 0,
        to: 0,
        color: "#82c8f2",
      },
    ],
    heading: "One supplied bar",
    showLegend: false,
  });
  const markup = _render({ preset: "bar-race", input: bars });
  assert.match(markup, /width="150" height="43"/);
  assert.match(markup, />Authored</);
  assert.doesNotMatch(markup, /Alpha|Beta|Gamma|Delta/);
  const trace = structuredClone(stockContracts["line-trace"].defaultInput);
  Object.assign(trace, {
    points: [0, 100],
    reference: [100, 0],
    showReference: false,
  });
  assert.match(
    _render({ preset: "line-trace", input: trace }),
    /M121 458 L839 148/,
  );
  assert.throws(() =>
    _render({
      preset: "bar-race",
      input: {
        ...bars,
        bars: [
          {
            label: "Overflow",
            start: 101,
            end: 0,
            from: 0,
            to: 0,
            color: "#82c8f2",
          },
        ],
      },
    }),
  );
});

test("mapping enrichment retains explicit correspondence and source-derived acceptance", () => {
  const contract = stockContracts["schema-mapping"];
  assert.ok(
    contract.metadata.tags.some(({ message }) => message === "case schema"),
  );
  assert.ok(
    contract.semanticRules.some(({ description }) =>
      description.includes("never manufacture"),
    ),
  );
  const input = {
    mappings: [{ source: "identifier", target: "case_key", type: "string" }],
    sourceLabel: "Dataset",
    targetLabel: "Case fields",
    showChecks: false,
  };
  const markup = _render({ preset: "schema-mapping", input: input });
  assert.match(markup, />identifier</);
  assert.match(markup, />case_key</);
  assert.doesNotMatch(markup, /record_id|created_at|timestamp/);
});

test("all authored fixture text is passed through instead of retaining default labels", () => {
  const textValues = (value: unknown, key = ""): string[] => {
    if (["color", "command", "lines"].includes(key)) {
      return [];
    }
    if (typeof value === "string") {
      return value ? [value] : [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => textValues(item, key));
    }
    if (value && typeof value === "object") {
      return Object.entries(value).flatMap(([field, item]) =>
        textValues(item, field),
      );
    }
    return [];
  };
  LEGACY_IDS.forEach((preset) => {
    stockContracts[preset].fixtures.forEach(({ id, input }) => {
      const markup = _render({ preset: preset, input: input });
      const visibleInput =
        preset === "line-trace" &&
        "showReference" in input &&
        !input.showReference
          ? { ...input, referenceLabel: "" }
          : preset === "dot-matrix" &&
              "showLegend" in input &&
              !input.showLegend
            ? { ...input, groups: [] }
            : input;
      textValues(visibleInput).forEach((text) => {
        const escaped = renderToStaticMarkup(
          createElement("text", null, text),
        ).slice(6, -7);
        assert.ok(markup.includes(escaped), `${preset} ${id} dropped ${text}`);
      });
    });
  });
});

test("masked words reject content wider than the fixed authored masks", () => {
  const input = stockContracts["word-reveal"].defaultInput;
  assert.throws(
    () =>
      parseStockInput({
        preset: "word-reveal",
        rawInput: {
          ...input,
          words: [{ word: "WWWWWW", accented: false }],
        },
      }),
    /words/,
  );
});

test("wide authored labels fail before overflowing fixed node and bar slots", () => {
  const graph = stockContracts["network-graph"].defaultInput;
  assert.throws(
    () =>
      parseStockInput({
        preset: "network-graph",
        rawInput: {
          ...graph,
          nodes: [
            { ...graph.nodes[0], label: "W".repeat(12) },
            ...graph.nodes.slice(1),
          ],
        },
      }),
    /nodes.0.label/,
  );
  const bars = stockContracts["bar-race"].defaultInput;
  assert.throws(
    () =>
      parseStockInput({
        preset: "bar-race",
        rawInput: {
          ...bars,
          bars: [
            { ...bars.bars[0], label: "W".repeat(12) },
            ...bars.bars.slice(1),
          ],
        },
      }),
    /bars.0.label/,
  );
  assert.doesNotThrow(() =>
    parseStockInput({
      preset: "bar-race",
      rawInput: {
        ...bars,
        bars: [{ ...bars.bars[0], label: "WWWW" }, ...bars.bars.slice(1)],
      },
    }),
  );
});

test("dense traversal summaries expand within the header instead of overflowing the pill", () => {
  const dense = stockContracts["node-traversal"].fixtures.find(
    ({ id }) => id === "dense",
  );
  assert.ok(dense);
  const markup = _render({ preset: "node-traversal", input: dense.input });
  assert.match(markup, /x="676" y="44" width="220"/);
  assert.match(markup, />A → B → C → D → E → F → G</);
});

test("long node labels wrap a complete route summary inside the header", () => {
  const contract = stockContracts["node-traversal"];
  const dense = contract.fixtures.find(({ id }) => id === "dense");
  assert.ok(dense);
  const input = {
    ...dense.input,
    nodes: dense.input.nodes.map((node, index) => ({
      ...node,
      label: `MMMMMMM${index}`,
    })),
  };
  const markup = _render({ preset: "node-traversal", input: input });
  assert.match(markup, /x="520" y="44" width="376"/);
  assert.match(markup, /font-size="12"/);
  input.nodes.forEach(({ label }) => assert.ok(markup.includes(label)));
});

test("baseline normalization preserves semantic SVG definition suffixes", () => {
  assert.equal(
    _normalizeSvgIds(
      'id="stock-_R_0_-chart-fill" fill="url(#stock-_R_0_-chart-fill)"',
    ),
    'id="stock-ID-chart-fill" fill="url(#stock-ID-chart-fill)"',
  );
  assert.equal(
    _normalizeSvgIds('id="stock-_R_9_-chart-fill"'),
    _normalizeSvgIds('id="stock-_R_0_-chart-fill"'),
  );
  assert.notEqual(
    _normalizeSvgIds('id="stock-_R_0_-chart-clip"'),
    _normalizeSvgIds('id="stock-_R_0_-scan-clip"'),
  );
});

test("large weighted metric and unit pairs cannot overflow the fixed display", () => {
  const input = stockContracts["metric-counter"].defaultInput;
  assert.throws(
    () =>
      parseStockInput({
        preset: "metric-counter",
        rawInput: {
          ...input,
          value: 0,
          unit: " mmmmmm",
        },
      }),
    /unit/,
  );
  assert.doesNotThrow(() =>
    parseStockInput({
      preset: "metric-counter",
      rawInput: { ...input, value: 725, unit: " kg" },
    }),
  );
});
