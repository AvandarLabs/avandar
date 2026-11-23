import { ProportionalSymbolAreaTestState } from "./ProportionalSymbolAreaTestState";

const {
  render,
  marks: _marks,
  attribute: _attribute,
  number: _number,
  getVisibleTexts,
} = ProportionalSymbolAreaTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { proportionalSymbolAreaContract as contract } from "../../ProportionalSymbolArea.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ProportionalSymbolArea.fixtures";
import { inputSchema, type Input } from "../../ProportionalSymbolArea.schema";
import { assertCircleAreaRadiusLegendValues as _assertCircleAreaRadiusLegendValues } from "./assertCircleAreaRadiusLegendValues";

test("circle area, radius and legend share one authored area scale", () => {
  [
    [1, 4],
    [2, 8],
    [2, 2],
    [1, 9],
    [9, 1],
    [2, 7],
  ].forEach((values) => {
    return _assertCircleAreaRadiusLegendValues(values);
  });
});

test("unit tiles physically reshape before the complete symbols hold", () => {
  const initial = _marks({ markup: render({ frame: 50 }), name: "unit-tile" }),
    middle = _marks({ markup: render({ frame: 80 }), name: "unit-tile" });
  assert.equal(initial.length, 5);
  assert.equal(middle.length, 5);
  initial.forEach((tile, i) => {
    return assert.notEqual(
      _attribute({ markup: tile, name: "d" }),
      _attribute({ markup: middle[i], name: "d" }),
    );
  });
  assert.equal(
    _marks({ markup: render({ frame: 110 }), name: "symbol" }).length,
    2,
  );
});

test("fixtures retain exact input while schemas reject invalid documents", () => {
  fixtures.forEach(({ input }) => {
    return assert.deepEqual(inputSchema.parse(input), input);
  });
  invalidInputs.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

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

registerStockDefaultTextAssertions({
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
