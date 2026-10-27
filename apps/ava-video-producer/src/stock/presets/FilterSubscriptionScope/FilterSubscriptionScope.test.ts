/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { FilterSubscriptionScope } from "./FilterSubscriptionScope";
import { filterSubscriptionScopeContract as contract } from "./FilterSubscriptionScope.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./FilterSubscriptionScope.fixtures";
import { inputSchema, type Input } from "./FilterSubscriptionScope.schema";
const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(FilterSubscriptionScope, {
        frame,
        input,
        accent: "#72d5bd",
        id: "packet28",
      }),
    ),
  );
function _marks({ markup, name }: { markup: string; name: string }): string[] {
  return [
    ...markup.matchAll(new RegExp(`<[^>]*data-${name}="[^"]*"[^>]*>`, "g")),
  ].map((match) => match[0]);
}
function _attribute({
  markup,
  name,
}: {
  markup: string;
  name: string;
}): string {
  const result = markup.match(new RegExp(` ${name}="([^"]*)"`));
  assert.ok(result, `Missing ${name} in ${markup}`);
  return result[1];
}
function _number({ markup, name }: { markup: string; name: string }): number {
  return Number(_attribute({ markup, name }));
}
test("only subscribed views change their row counts and sums", () => {
  const before = _marks({ markup: render({ frame: 40 }), name: "view" });
  assert.equal(before.length, 3);
  assert.deepEqual(
    before.map((row) => [
      _number({ markup: row, name: "data-count" }),
      _number({ markup: row, name: "data-sum" }),
    ]),
    [
      [3, 10],
      [3, 10],
      [3, 10],
    ],
  );
  [DEFAULT_INPUT, fixtures[3].input].forEach((input, index) => {
    const views = _marks({
      markup: render({ frame: 150, input: input }),
      name: "view",
    });
    assert.deepEqual(
      views.map((row) => [
        _number({ markup: row, name: "data-count" }),
        _number({ markup: row, name: "data-sum" }),
      ]),
      index === 0
        ? [
            [2, 5],
            [2, 5],
            [3, 10],
          ]
        : [
            [1, 5],
            [1, 5],
            [3, 10],
          ],
    );
    views.forEach((view) => {
      assert.equal(
        _attribute({ markup: view, name: "data-value-unit" }),
        input.metric.valueUnit,
      );
      assert.equal(
        _attribute({ markup: view, name: "data-count-unit" }),
        input.metric.countUnit,
      );
    });
  });
});
test("excluded masks travel across only subscribed nonmatching rows", () => {
  const a = _marks({ markup: render({ frame: 91 }), name: "excluded-mask" }),
    b = _marks({ markup: render({ frame: 115 }), name: "excluded-mask" }),
    c = _marks({ markup: render({ frame: 139 }), name: "excluded-mask" });
  assert.equal(a.length, 2);
  a.forEach((mark, i) => {
    assert.equal(_number({ markup: mark, name: "width" }), 0);
    assert.ok(_number({ markup: b[i], name: "width" }) > 0);
    assert.equal(_number({ markup: c[i], name: "width" }), 246);
  });
  assert.equal(
    _marks({
      markup: render({ frame: 150, input: fixtures[3].input }),
      name: "excluded-row",
    }).length,
    4,
  );
  assert.ok(
    _marks({
      markup: render({ frame: 150, input: fixtures[3].input }),
      name: "excluded-row",
    }).every((mark) => _number({ markup: mark, name: "opacity" }) === 0),
  );
});
test("fixtures retain exact input while schemas reject invalid documents", () => {
  fixtures.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  ...Object.values(input.copy),
  input.metric.valueLabel,
  ...input.views.map(prop("label")),
  ...input.records.map(prop("category")),
  input.selectedCategory,
  ...input.views.flatMap((view) => {
    const rows =
      view.subscribed && frame >= 139
        ? input.records.filter(propEq("category", input.selectedCategory))
        : input.records;
    return [
      `${rows.reduce((sum, record) => sum + record.value, 0)} ${input.metric.valueUnit}`,
      `${rows.length} ${input.metric.countUnit}`,
    ];
  }),
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "category", "selectedCategory"],
  getVisibleTexts,
  textFrames: [40, 98, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render,
  excludedTextFields: ["id", "category", "selectedCategory"],
  getVisibleTexts,
});
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["views", 0, "label"],
    ["views", 1, "label"],
    ["views", 2, "label"],
    ["metric", "valueLabel"],
    ["metric", "valueUnit"],
    ["metric", "countUnit"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("all-category and zero-value selections retain the independent denominator", () => {
  [
    DEFAULT_INPUT.records.map((record) => ({ ...record, category: "West" })),
    DEFAULT_INPUT.records.map((record) => ({
      ...record,
      value: record.category === "West" ? 0 : record.value,
    })),
  ].forEach((records) => {
    const input = { ...DEFAULT_INPUT, records };
    const views = _marks({
      markup: render({ frame: 150, input: input }),
      name: "view",
    });
    const selected = records.filter(propEq("category", input.selectedCategory));
    assert.deepEqual(
      views.map((view) => [
        _number({ markup: view, name: "data-count" }),
        _number({ markup: view, name: "data-sum" }),
      ]),
      [
        [selected.length, selected.reduce((sum, row) => sum + row.value, 0)],
        [selected.length, selected.reduce((sum, row) => sum + row.value, 0)],
        [records.length, records.reduce((sum, row) => sum + row.value, 0)],
      ],
    );
    assert.equal(
      _marks({
        markup: render({ frame: 150, input: input }),
        name: "source-record",
      }).length,
      records.length * input.views.length,
    );
    assert.deepEqual(input.records, records);
  });
});
test("empty, Unicode and maximum-length identities preserve exact keys", () => {
  const input = {
    ...DEFAULT_INPUT,
    records: DEFAULT_INPUT.records.map((record, index) => ({
      ...record,
      id: ["", "界 key", "W".repeat(12)][index],
    })),
    views: DEFAULT_INPUT.views.map((view, index) => ({
      ...view,
      id: ["", "view key", "W".repeat(12)][index],
    })),
  };
  assert.deepEqual(inputSchema.parse(input), input);
  assert.equal(
    _marks({ markup: render({ frame: 150, input: input }), name: "view" })
      .length,
    3,
  );
});
test("hidden excluded records leave no visible mask at the resolved hold", () => {
  assert.ok(
    _marks({
      markup: render({ frame: 150, input: fixtures[3].input }),
      name: "excluded-mask",
    }).every((mark) => _number({ markup: mark, name: "opacity" }) === 0),
  );
});
