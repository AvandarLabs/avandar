/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { PredicatePushdownBoundary } from "./PredicatePushdownBoundary";
import { predicatePushdownBoundaryContract as contract } from "./PredicatePushdownBoundary.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PredicatePushdownBoundary.fixtures";
import { inputSchema, type Input } from "./PredicatePushdownBoundary.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PredicatePushdownBoundary, {
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
test("only matching copies cross the boundary while source originals persist", () => {
  const markup = render({ frame: 150 });
  assert.deepEqual(
    _marks({ markup, name: "transfer-row" }).map((mark) =>
      _attribute({ markup: mark, name: "data-transfer-row" }),
    ),
    ["b", "d"],
  );
  assert.equal(_marks({ markup, name: "source-row" }).length, 4);
  const ledger = _marks({ markup, name: "ledger" })[0];
  assert.equal(
    _number({ markup: ledger, name: "data-transferred" }) +
      _number({ markup: ledger, name: "data-excluded" }),
    4,
  );
  const start = _marks({ markup: render({ frame: 96 }), name: "transfer-row" }),
    middle = _marks({ markup: render({ frame: 118 }), name: "transfer-row" }),
    end = _marks({ markup, name: "transfer-row" });
  start.forEach((mark, i) => {
    assert.equal(_number({ markup: mark, name: "data-x" }), 64);
    assert.ok(
      _number({ markup: middle[i], name: "data-x" }) > 64 &&
        _number({ markup: middle[i], name: "data-x" }) < 580,
    );
    assert.equal(_number({ markup: end[i], name: "data-x" }), 580);
  });
});
test("inclusive equality and extreme thresholds preserve exact membership", () => {
  ([">=", "<="] as const).forEach((operator) =>
    [-100, 2, 7, 100].forEach((threshold) => {
      const input: Input = {
        ...DEFAULT_INPUT,
        predicate: { operator, threshold },
        showTotals: false,
      };
      const expected = input.rows.filter((row: Input["rows"][number]) =>
        operator === ">=" ? row.value >= threshold : row.value <= threshold,
      );
      assert.deepEqual(
        _marks({
          markup: render({ frame: 150, input: input }),
          name: "transfer-row",
        }).map((mark) =>
          _attribute({ markup: mark, name: "data-transfer-row" }),
        ),
        expected.map(prop("id")),
      );
      assert.equal(
        _marks({
          markup: render({ frame: 150, input: input }),
          name: "source-row",
        }).length,
        input.rows.length,
      );
    }),
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
  input.labels.source,
  input.labels.destination,
  ...(frame >= 50 ? [input.labels.condition] : []),
  ...(frame >= 95 ? [input.labels.retained] : []),
  ...(frame >= 139 ? [input.labels.transferred] : []),
  input.metric.label,
  input.metric.unit,
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id", "operator"],
  getVisibleTexts,
  textFrames: [40, 98, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render,
  excludedTextFields: ["id", "operator"],
  getVisibleTexts,
});
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["metric", "label"],
    ["metric", "unit"],
    ["metric", "rowUnit"],
    ["labels", "source"],
    ["labels", "destination"],
    ["labels", "condition"],
    ["labels", "retained"],
    ["labels", "transferred"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("signed decimal rows, maximum labels and hidden totals retain the same transfer", () => {
  const input: Input = {
    ...fixtures[2].input,
    rows: [
      { id: "", value: -0.0000010000000000000002 },
      { id: "界 key", value: 100 },
    ],
    predicate: { operator: "<=", threshold: -0.0000010000000000000002 },
  };
  const before = structuredClone(input);
  assert.deepEqual(inputSchema.parse(input), input);
  const visible = _marks({
    markup: render({ frame: 150, input: input }),
    name: "transfer-row",
  });
  assert.deepEqual(
    visible.map((mark) =>
      _attribute({ markup: mark, name: "data-transfer-row" }),
    ),
    [""],
  );
  assert.deepEqual(
    _marks({
      markup: render({ frame: 150, input: { ...input, showTotals: false } }),
      name: "transfer-row",
    }),
    visible,
  );
  assert.deepEqual(input, before);
  assert.equal(
    _attribute({
      markup: _marks({
        markup: render({ frame: 150, input: input }),
        name: "predicate",
      })[0],
      name: "data-unit",
    }),
    input.metric.unit,
  );
});
test("source condition caption waits until the moving predicate clears its lane", () => {
  assert.ok(
    !render({ frame: 40 }).includes(
      `aria-label="${DEFAULT_INPUT.labels.condition}"`,
    ),
  );
  assert.equal(
    render({ frame: 60 }).split(
      `aria-label="${DEFAULT_INPUT.labels.condition}"`,
    ).length - 1,
    1,
  );
});
test("row copies clear the source before compacting destination rows", () => {
  const markup = render({ frame: 118 }),
    sources = _marks({ markup, name: "source-row" }),
    copies = _marks({ markup, name: "transfer-row" });
  copies.forEach((copy) => {
    const source = sources.find(
      (row) =>
        _attribute({ markup: row, name: "data-source-row" }) ===
        _attribute({ markup: copy, name: "data-transfer-row" }),
    )!;
    assert.equal(
      _number({ markup: copy, name: "data-y" }),
      _number({ markup: source, name: "data-y" }),
    );
  });
  assert.ok(
    markup.indexOf("data-transfer-row=") < markup.indexOf("data-source-row="),
    "Source originals must paint above partially extracted copies.",
  );
});
function _accounting(markup: string): Array<{ kind: string; content: string }> {
  return [
    ...markup.matchAll(/<g data-accounting="([^"]+)"[^>]*>(.*?)<\/g><\/g>/g),
  ].map(([, kind, content]) => ({ kind, content }));
}
test("visible transfer accounting waits for arrival and distinguishes each denominator", () => {
  [
    DEFAULT_INPUT,
    {
      ...DEFAULT_INPUT,
      predicate: { operator: ">=" as const, threshold: -100 },
    },
    {
      ...DEFAULT_INPUT,
      predicate: { operator: ">=" as const, threshold: 100 },
    },
  ].forEach((input) => {
    const numSelected = input.rows.filter(
      (row) => row.value >= input.predicate.threshold,
    ).length;
    [36, 90, 95, 118, 138, 139, 150].forEach((frame) => {
      if (frame < 139) {
        assert.ok(
          !render({ frame: frame, input: input }).includes(
            `aria-label="${input.labels.transferred}"`,
          ),
        );
      }
      const groups = _accounting(render({ frame: frame, input: input }));
      const expected = [
        {
          kind: "source",
          label: input.labels.source,
          value: input.rows.length,
        },
        ...(frame >= 95
          ? [
              {
                kind: "excluded",
                label: input.labels.retained,
                value: input.rows.length - numSelected,
              },
            ]
          : []),
        ...(frame >= 139
          ? [
              {
                kind: "transferred",
                label: input.labels.transferred,
                value: numSelected,
              },
            ]
          : []),
      ];
      assert.deepEqual(
        groups.map(prop("kind")),
        expected.map(prop("kind")),
        `frame ${frame}`,
      );
      groups.forEach((group, index) => {
        assert.ok(
          group.content.includes(`aria-label="${expected[index].label}"`),
        );
        assert.ok(
          group.content.includes(
            `aria-label="${expected[index].value} ${input.metric.rowUnit}"`,
          ),
        );
      });
      if (frame < 139) {
        assert.ok(
          !render({ frame: frame, input: input }).includes(
            `aria-label="${input.labels.transferred}"`,
          ),
        );
      }
    });
    const hidden = render({
      frame: 150,
      input: { ...input, showTotals: false },
    });
    _accounting(hidden).forEach((group) =>
      assert.ok(!group.content.includes(input.metric.rowUnit)),
    );
    assert.deepEqual(
      _marks({ markup: hidden, name: "transfer-row" }),
      _marks({
        markup: render({ frame: 150, input: input }),
        name: "transfer-row",
      }),
    );
  });
});
