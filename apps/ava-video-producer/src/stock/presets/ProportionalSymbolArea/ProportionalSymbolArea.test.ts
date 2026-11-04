/** Observable semantic and motion assertions for the authored scene. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { ProportionalSymbolArea } from "./ProportionalSymbolArea";
import { proportionalSymbolAreaContract as contract } from "./ProportionalSymbolArea.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ProportionalSymbolArea.fixtures";
import { inputSchema, type Input } from "./ProportionalSymbolArea.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ProportionalSymbolArea, {
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
test("circle area, radius and legend share one authored area scale", () => {
  [
    [1, 4],
    [2, 8],
    [2, 2],
    [1, 9],
    [9, 1],
    [2, 7],
  ].forEach((values) => {
    const input: Input = {
      ...DEFAULT_INPUT,
      sites: DEFAULT_INPUT.sites.map(
        (site: Input["sites"][number], i: number) => ({
          ...site,
          value: values[i],
        }),
      ),
    };
    const circles = _marks({
      markup: render({ frame: 150, input: input }),
      name: "symbol",
    });
    assert.equal(circles.length, 2);
    const ratio = values[1] / values[0];
    assert.ok(
      Math.abs(
        _number({ markup: circles[1], name: "r" }) /
          _number({ markup: circles[0], name: "r" }) -
          Math.sqrt(ratio),
      ) < 1e-12,
    );
    assert.equal(
      _number({ markup: circles[1], name: "data-area" }) /
        _number({ markup: circles[0], name: "data-area" }),
      ratio,
    );
    assert.equal(
      _number({
        markup: _marks({
          markup: render({ frame: 150, input: input }),
          name: "area-legend",
        })[0],
        name: "data-area-per-unit",
      }),
      input.areaPerUnit,
    );
    const moved = {
      ...input,
      sites: input.sites.map((site: Input["sites"][number]) => ({
        ...site,
        x: site.x + 2,
      })),
    };
    assert.deepEqual(
      _marks({
        markup: render({ frame: 150, input: moved }),
        name: "symbol",
      }).map((mark) => _number({ markup: mark, name: "r" })),
      circles.map((mark) => _number({ markup: mark, name: "r" })),
    );
  });
});
test("unit tiles physically reshape before the complete symbols hold", () => {
  const initial = _marks({ markup: render({ frame: 50 }), name: "unit-tile" }),
    middle = _marks({ markup: render({ frame: 80 }), name: "unit-tile" });
  assert.equal(initial.length, 5);
  assert.equal(middle.length, 5);
  initial.forEach((tile, i) =>
    assert.notEqual(
      _attribute({ markup: tile, name: "d" }),
      _attribute({ markup: middle[i], name: "d" }),
    ),
  );
  assert.equal(
    _marks({ markup: render({ frame: 110 }), name: "symbol" }).length,
    2,
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
  ...input.sites.flatMap((site, index) => [
    `${index + 1} · ${site.label}`,
    `${site.value} ${input.unitLabel}`,
  ]),
  `1 ${input.unitLabel} = ${input.areaPerUnit} px²`,
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
    ["sites", 0, "label"],
    ["sites", 1, "label"],
    ["unitLabel"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("exact plot edges and separation limits remain legal at both scale extremes", () => {
  [100, 900].forEach((areaPerUnit) => {
    const radius = Math.sqrt(areaPerUnit / Math.PI);
    const x = radius / 4;
    const first = { id: "a", label: "Edge", x, y: 50, value: 1 };
    const second = {
      id: "b",
      label: "Separated",
      x: x + (radius * 2 + 12) / 4,
      y: 50,
      value: 1,
    };
    const input: Input = {
      ...DEFAULT_INPUT,
      areaPerUnit,
      sites: [first, second],
    };
    assert.deepEqual(inputSchema.parse(input), input);
    assert.equal(
      inputSchema.safeParse({
        ...input,
        sites: [first, { ...second, x: second.x - 0.000001 }],
      }).success,
      false,
    );
    assert.equal(
      inputSchema.safeParse({
        ...input,
        sites: [{ ...first, x: first.x - 0.000001 }, second],
      }).success,
      false,
    );
    const circle = _marks({
      markup: render({ frame: 150, input: input }),
      name: "symbol",
    })[0];
    assert.equal(
      _number({ markup: circle, name: "cx" }),
      48 + _number({ markup: circle, name: "r" }),
    );
  });
});
