import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ShelterUsableAreaCapacity } from "./ShelterUsableAreaCapacity";
import { shelterUsableAreaCapacityContract } from "./ShelterUsableAreaCapacity.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  changedInput,
} from "./ShelterUsableAreaCapacity.fixtures";
import { inputSchema, type Input } from "./ShelterUsableAreaCapacity.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ShelterUsableAreaCapacity, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet18",
      }),
    ),
  );
}
test("default gross 24 and usable 12 produce six equivalents with shortfall two", () => {
  assert.ok(
    _render({ frame: 150 }).includes(
      'data-gross="24" data-usable="12" data-equivalents="6" data-shortfall="2"',
    ),
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return frame >= 120
    ? Object.values(input.copy)
    : [
        input.copy.context,
        input.copy.gross,
        input.copy.sleeping,
        input.copy.circulation,
        input.copy.storage,
        input.copy.closed,
      ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "cellIds",
  "eventBinId",
  "firstSnapshot",
  "focusedLocationId",
  "measure",
  "role",
  "kind",
  "initialDayId",
  "initialBandId",
  "agreedDayId",
  "agreedBandId",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: shelterUsableAreaCapacityContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
test("excluded roles lift while only sleeping tiles unroll into the measured strip", () => {
  const setup = _render({ frame: 0 }),
    lift = _render({ frame: 72 }),
    hold = _render({ frame: 150 });
  const tile = (markup: string, id: string) =>
    [...markup.matchAll(/<rect data-floor-tile="([^"]*)"[^>]+>/g)].find(
      (match) => match[1] === id,
    )![0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(setup, "c"),
      name: "y",
    }),
    145,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(lift, "c"),
      name: "y",
    }),
    121,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(hold, "a"),
      name: "y",
    }),
    390,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(hold, "a"),
      name: "width",
    }),
    60,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(hold, "c"),
      name: "data-usable-area",
    }),
    0,
  );
  assert.equal((hold.match(/data-place-division=/g) ?? []).length, 7);
});
test("decimal hundredths yield exactly 33 places without double rounding", () => {
  assert.match(
    _render({ frame: 150, input: inputSchema.parse(changedInput) }),
    /data-gross="48.18" data-usable="24.09" data-equivalents="33" data-shortfall="0" data-spare="25"/,
  );
  [8.03, 1.01, 19.99].forEach((areaPerTile) =>
    assert.equal(
      inputSchema.safeParse({ ...DEFAULT_INPUT, areaPerTile }).success,
      true,
    ),
  );
  [8.030000000000001, 1.001].forEach((areaPerTile) =>
    assert.equal(
      inputSchema.safeParse({ ...DEFAULT_INPUT, areaPerTile }).success,
      false,
    ),
  );
  assert.match(
    _render({ frame: 150, input: fixtures[1].input }),
    /data-gross="16" data-usable="0" data-equivalents="0" data-shortfall="0" data-spare="0"/,
  );
  assert.match(
    _render({ frame: 150, input: { ...DEFAULT_INPUT, registeredPeople: 0 } }),
    /data-equivalents="6" data-shortfall="0" data-spare="6"/,
  );
});
test("the gross envelope follows the real perimeter instead of inventing missing tiles", () => {
  const markup = _render({ frame: 0 });
  assert.equal((markup.match(/data-gross-outline=/g) ?? []).length, 1);
  assert.match(
    SvgAttributes.fromMarker({ markup, marker: "gross-outline" }),
    /d="M60 145h82/,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: changedInput }),
    /data-gross-outline=/,
  );
});
test("area division and demand comparison are revealed only after usable tiles unroll", () => {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 0 }),
        marker: "capacity-summary",
      }),
      name: "opacity",
    }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 120 }),
        marker: "capacity-summary",
      }),
      name: "opacity",
    }),
    1,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 90 }),
        marker: "usable-measures",
      }),
      name: "opacity",
    }),
    0,
  );
});
