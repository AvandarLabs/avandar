import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { CacheCell } from "../../CacheCell";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "../../QueryColumnCacheGrowth.fixtures";
import { inputSchema } from "../../QueryColumnCacheGrowth.schema";
import { assertLiteralCellsWrapWholeAttributes as _assertLiteralCellsWrapWholeAttributes } from "./assertLiteralCellsWrapWholeAttributes";
import { QueryColumnCacheGrowthTestState } from "./QueryColumnCacheGrowthTestState";

const { render, options } = QueryColumnCacheGrowthTestState;

test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) => {
    return assert.deepEqual(inputSchema.parse(input), input);
  });
  invalidInputs.forEach((input) => {
    return assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    );
  });
});

test("one cache widens from key/name to key/name/value preserving both B occurrences", () => {
  const first = render({ frame: 55, input: DEFAULT_INPUT }),
    hold = render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal((hold.match(/data-cache-table=/g) || []).length, 1);
  assert.equal((first.match(/data-cache-column=/g) || []).length, 2);
  assert.equal((hold.match(/data-cache-column=/g) || []).length, 3);
  assert.equal((hold.match(/data-cache-row=/g) || []).length, 3);
  assert.equal((hold.match(/data-literal-value="B"/g) || []).length, 2);
  assert.match(first, /data-covered="true"/);
  assert.match(
    render({ frame: 90, input: DEFAULT_INPUT }),
    /data-missing-column="value"/,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hold,
        marker: "cache-table",
      }),
      name: "width",
    }) >
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: first,
          marker: "cache-table",
        }),
        name: "width",
      }),
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
  contract: options.contract,
  suppliedInputs: FIXTURES.map(prop("input")),
  expectedTextPaths: [
    ["columns", 0, "label"],
    ["columns", 1, "label"],
    ["columns", 2, "label"],
    ["requests", 0, "label"],
    ["requests", 1, "label"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
});

test("literal cells wrap at whole graphemes and retain exact line concatenation inside their cell", () => {
  [
    "界".repeat(16),
    "é".repeat(8),
    "👩‍🔬👩‍🔬👩‍🔬",
    "A B\tC\nD\rE",
    "",
    " ".repeat(16),
    "·⇥↵␍",
  ].forEach((value) => {
    const markup = renderToStaticMarkup(
      createElement(CacheCell, {
        value,
        columnId: "value",
        rowIndex: 2,
        x: 742,
        y: 439,
      }),
    );
    const segments = Array.from(
      new Intl.Segmenter("und", { granularity: "grapheme" }).segment(value),
      prop("segment"),
    );
    const expected = [
      segments.slice(0, 8).join(""),
      ...(segments.length > 8 ? [segments.slice(8).join("")] : []),
    ];
    const texts = [...markup.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)];
    assert.equal(texts.length, expected.length);
    assert.equal(expected.join(""), value);
    texts.forEach(([, attributes, body], index) => {
      return _assertLiteralCellsWrapWholeAttributes({
        attributes,
        body,
        index,
        expected,
      });
    });
    SvgPaintAssertions.assertTextCanvasBounds({ markup });
  });
});

test("hidden notation retains a missing-column cue and every empty or repeated occurrence", () => {
  const input = FIXTURES[3].input,
    hold = render({ frame: 150, input: input }),
    missing = render({ frame: 90, input: input });
  assert.doesNotMatch(missing, /data-set-notation=/);
  assert.match(missing, /data-missing-column="value"/);
  assert.equal((hold.match(/data-cache-row=/g) || []).length, 3);
  assert.ok(hold.includes('data-raw-cell=""'));
  assert.ok(hold.includes('data-raw-cell="\t"'));
  assert.ok(hold.includes('data-raw-cell=" "'));
  const cells = [
    ...hold.matchAll(
      /data-cache-cell="key" data-row-index="(\d+)" data-raw-cell="([^"]*)"/g,
    ),
  ].map(([, row, value]) => {
    return [Number(row), value];
  });
  assert.deepEqual(cells, [
    [0, "A"],
    [1, "B"],
    [2, "B"],
  ]);
});

test("adding an earlier source column leaves all existing cached cell positions fixed", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    cachedColumnIds: ["key", "value"],
    requests: [
      { label: "Read values", columnIds: ["value"] },
      { label: "Read name", columnIds: ["name"] },
    ],
  });
  const getX = (markup: string, id: string) => {
    const group = markup.match(
      new RegExp(`<g data-cache-cell="${id}"[^>]*>([\\s\\S]*?)<\\/g>`),
    )?.[1];
    assert.ok(group);
    return SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: group,
        marker: "literal-value",
      }),
      name: "x",
    });
  };
  ["key", "value"].forEach((id) => {
    return assert.equal(
      getX(render({ frame: 150, input: input }), id),
      getX(render({ frame: 55, input: input }), id),
    );
  });
});

test("the covered request routes to its actual selected columns", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    requests: [
      { label: "Read key", columnIds: ["key"] },
      DEFAULT_INPUT.requests[1],
    ],
  });
  const markup = render({ frame: 50, input: input });
  assert.match(markup, /data-requested-column="key"/);
  assert.doesNotMatch(markup, /data-requested-column="name"/);
  const path = markup.match(
    /data-requested-column="key"><path[^>]*d="([^"]*)"/,
  )?.[1];
  assert.equal(path, "M260 178 V225 H144 V247");
});
