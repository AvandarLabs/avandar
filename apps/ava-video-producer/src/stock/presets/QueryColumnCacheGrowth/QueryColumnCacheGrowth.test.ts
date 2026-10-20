import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { QueryColumnCacheGrowth } from "./QueryColumnCacheGrowth";
import { queryColumnCacheGrowthContract } from "./QueryColumnCacheGrowth.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "./QueryColumnCacheGrowth.fixtures";
import { inputSchema, type Input } from "./QueryColumnCacheGrowth.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(QueryColumnCacheGrowth, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;
test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  invalidInputs.forEach((input) =>
    assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    ),
  );
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

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    ...input.requests.map(prop("label")),
    ...input.columns
      .filter(({ id }) => input.cachedColumnIds.includes(id) || frame >= 106)
      .map(prop("label")),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "pattern",
  "kind",
  "workpieceMaterial",
  "transferState",
  "enclosure",
  "targetModuleId",
  "source",
  "destination",
  "category",
  "measure",
  "question",
  "selectedCategory",
  "columnIds",
  "cachedColumnIds",
  "keyColumnId",
  "cells",
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs,
  contract: queryColumnCacheGrowthContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
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

import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
import { CacheCell } from "./CacheCell";
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
      ({ segment }) => segment,
    );
    const expected = [
      segments.slice(0, 8).join(""),
      ...(segments.length > 8 ? [segments.slice(8).join("")] : []),
    ];
    const texts = [...markup.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)];
    assert.equal(texts.length, expected.length);
    assert.equal(expected.join(""), value);
    texts.forEach(([, attributes, body], index) => {
      const escape = (text: string) =>
        text
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      assert.ok(
        attributes.includes(`data-literal-value="${escape(expected[index])}"`),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes, name: "font-size" }),
        12,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
        439 + index * 17,
      );
      const rawSpans = [...body.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)]
        .map(([, text]) => text)
        .join("");
      assert.ok(
        getConservativeWidthFromText({
          text: rawSpans.replace(
            /[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}]/gu,
            "",
          ),
          fontSize: 12,
        }) <= 148,
      );
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
  ].map(([, row, value]) => [Number(row), value]);
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
  ["key", "value"].forEach((id) =>
    assert.equal(
      getX(render({ frame: 150, input: input }), id),
      getX(render({ frame: 55, input: input }), id),
    ),
  );
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
