/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { ChoroplethClassBreaks } from "./ChoroplethClassBreaks";
import { choroplethClassBreaksContract as contract } from "./ChoroplethClassBreaks.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ChoroplethClassBreaks.fixtures";
import { inputSchema, type Input } from "./ChoroplethClassBreaks.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ChoroplethClassBreaks, {
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
test("moving class breaks reclassify only values crossing the current threshold", () => {
  const initial = _marks({ markup: render({ frame: 50 }), name: "zone" }),
    final = _marks({ markup: render({ frame: 150 }), name: "zone" });
  assert.equal(initial.length, 4);
  assert.deepEqual(
    initial.map((mark) => _attribute({ markup: mark, name: "data-class" })),
    ["low", "low", "high", "missing"],
  );
  assert.deepEqual(
    final.map((mark) => _attribute({ markup: mark, name: "data-class" })),
    ["low", "high", "high", "missing"],
  );
  [51, 60, 70, 80, 90, 110, 150].forEach((frame) => {
    const markup = render({ frame: frame });
    const threshold = _number({
      markup: _marks({ markup, name: "threshold" })[0],
      name: "data-value",
    });
    assert.ok(threshold >= 3 && threshold <= 5);
    _marks({ markup, name: "zone" }).forEach((mark, i) => {
      const value = DEFAULT_INPUT.zones[i].value;
      assert.equal(
        _attribute({ markup: mark, name: "data-value" }),
        value === null ? "null" : String(value),
      );
      assert.equal(
        _attribute({ markup: mark, name: "data-class" }),
        value === null ? "missing" : value < threshold ? "low" : "high",
      );
    });
  });
  assert.notEqual(
    _number({
      markup: _marks({ markup: render({ frame: 75 }), name: "threshold" })[0],
      name: "x1",
    }),
    _number({
      markup: _marks({ markup: render({ frame: 50 }), name: "threshold" })[0],
      name: "x1",
    }),
  );
});
test("lower, interior and inclusive final breaks classify without altering values", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    zones: [
      { id: "a", label: "", value: 0 },
      { id: "b", label: "", value: 5 },
      { id: "c", label: "", value: 10 },
    ],
  };
  assert.deepEqual(
    _marks({ markup: render({ frame: 50, input: input }), name: "zone" }).map(
      (mark) => _attribute({ markup: mark, name: "data-class" }),
    ),
    ["low", "high", "high"],
  );
  const missing = {
    ...DEFAULT_INPUT,
    zones: DEFAULT_INPUT.zones.map((zone: Input["zones"][number]) => ({
      ...zone,
      value: null,
    })),
  };
  assert.ok(
    _marks({
      markup: render({ frame: 80, input: missing }),
      name: "zone",
    }).every(
      (mark) => _attribute({ markup: mark, name: "data-class" }) === "missing",
    ),
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
  ...input.zones.map(prop("label")),
  ...input.schemes.map(prop("label")),
  input.unitLabel,
  input.noDataLabel,
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: ["id"],
  getVisibleTexts,
  textFrames: [40, 98, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render,
  excludedTextFields: ["id"],
  getVisibleTexts,
});
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["zones", 0, "label"],
    ["zones", 1, "label"],
    ["zones", 2, "label"],
    ["zones", 3, "label"],
    ["schemes", 0, "label"],
    ["schemes", 1, "label"],
    ["unitLabel"],
    ["noDataLabel"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("unchanged and extreme finite schemes retain exact missing and value states", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    schemes: [
      { label: "First", breaks: [-Number.MAX_VALUE, 3, Number.MAX_VALUE] },
      { label: "Second", breaks: [-Number.MAX_VALUE, 5, Number.MAX_VALUE] },
    ],
  };
  assert.deepEqual(inputSchema.parse(input), input);
  [24, 75, 110, 150].forEach((frame) =>
    assert.doesNotMatch(render({ frame: frame, input: input }), /NaN|Infinity/),
  );
  const unchanged = fixtures[3].input;
  assert.deepEqual(
    _marks({
      markup: render({ frame: 50, input: unchanged }),
      name: "zone",
    }).map((mark) => _attribute({ markup: mark, name: "data-class" })),
    _marks({
      markup: render({ frame: 150, input: unchanged }),
      name: "zone",
    }).map((mark) => _attribute({ markup: mark, name: "data-class" })),
  );
  [
    {
      ...DEFAULT_INPUT,
      schemes: [{ label: "x", breaks: [0, 5] }, DEFAULT_INPUT.schemes[1]],
    },
    {
      ...DEFAULT_INPUT,
      zones: [
        DEFAULT_INPUT.zones[0],
        DEFAULT_INPUT.zones[0],
        DEFAULT_INPUT.zones[1],
      ],
    },
  ].forEach((value) =>
    assert.equal(inputSchema.safeParse(value).success, false),
  );
});
test("each scheme legend owns its missing key, supplied label and unit", () => {
  [
    DEFAULT_INPUT,
    fixtures[2].input,
    {
      ...DEFAULT_INPUT,
      zones: DEFAULT_INPUT.zones.map((zone) => ({ ...zone, value: null })),
    },
  ].forEach((input) =>
    [50, 80, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        legends = markup.split(/<g data-class-legend-index="\d+">/).slice(1);
      assert.equal(
        markup.split(`aria-label="${input.noDataLabel}"`).length - 1,
        input.zones.filter(propEq("value", null)).length + 2,
      );
      assert.equal(legends.length, 2);
      legends.forEach((legend, index) => {
        const missing = _marks({ markup: legend, name: "missing-class-key" });
        assert.equal(missing.length, 1);
        assert.equal(
          _attribute({ markup: missing[0], name: "fill" }),
          "#728794",
        );
        assert.equal(
          _number({ markup: missing[0], name: "fill-opacity" }),
          0.15,
        );
        assert.equal(
          _attribute({ markup: missing[0], name: "stroke" }),
          "#728794",
        );
        assert.equal(
          _attribute({ markup: missing[0], name: "stroke-dasharray" }),
          "4 5",
        );
        assert.ok(legend.includes(`aria-label="${input.noDataLabel}"`));
        assert.ok(legend.includes(`aria-label="${input.unitLabel}"`));
        const breaks = input.schemes[index].breaks;
        assert.ok(legend.includes(`aria-label="[${breaks[0]}, ${breaks[1]})"`));
        assert.ok(legend.includes(`aria-label="[${breaks[1]}, ${breaks[2]}]"`));
      });
    }),
  );
});
test("fixed value ticks share the shortened ruler domain clear of both legends", () => {
  [50, 80, 150].forEach((frame) => {
    const markup = render({ frame: frame });
    _marks({ markup, name: "value-tick" }).forEach((mark) => {
      const zone = DEFAULT_INPUT.zones.find(
        (item) =>
          item.id === _attribute({ markup: mark, name: "data-value-tick" }),
      )!;
      assert.equal(
        _number({ markup: mark, name: "cx" }),
        64 + 424 * (zone.value! / 10),
      );
      assert.ok(
        _number({ markup: mark, name: "cx" }) +
          _number({ markup: mark, name: "r" }) <
          542,
      );
    });
  });
});
