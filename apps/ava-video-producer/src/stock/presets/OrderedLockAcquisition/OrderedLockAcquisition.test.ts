import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { OrderedLockAcquisition } from "./OrderedLockAcquisition";
import {
  DEFAULT_INPUT,
  FIXTURES,
  INVALID_INPUTS,
} from "./OrderedLockAcquisition.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from "./OrderedLockAcquisition.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(OrderedLockAcquisition, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
test("first turn swaps while resource-array order remains canonical", () => {
  const original = _render({ frame: 108, input: DEFAULT_INPUT });
  const reversed = _render({
    frame: 108,
    input: { ...DEFAULT_INPUT, firstOperationId: "two" },
  });
  assert.match(original, /data-key-owner="one"/);
  assert.match(reversed, /data-key-owner="two"/);
  assert.match(original, /data-canonical-order="a,b"/);
  assert.match(reversed, /data-canonical-order="a,b"/);
  assert.match(
    _render({ frame: 108, input: FIXTURES[3].input }),
    /data-canonical-order="b,a"/,
  );
});
test("keys physically return to their tray before the waiting operation reuses them", () => {
  const key = (frame: number, resource: string) =>
    _render({ frame: frame, input: DEFAULT_INPUT }).match(
      new RegExp(`<circle data-lock-key="${resource}"[^>]*>`),
    )![0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(108, "a"),
      name: "cy",
    }),
    235,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(108, "b"),
      name: "cy",
    }),
    235,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(122, "a"),
      name: "cy",
    }),
    100,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(122, "b"),
      name: "cy",
    }),
    100,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(138, "a"),
      name: "cy",
    }),
    435,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(138, "b"),
      name: "cy",
    }),
    435,
  );
  assert.match(key(122, "a"), /data-key-owner=""/);
  assert.doesNotMatch(
    _render({ frame: 108, input: DEFAULT_INPUT }),
    /data-key-owner="two"/,
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { orderedLockAcquisitionContract } from "./OrderedLockAcquisition.contract";
import { inputSchema } from "./OrderedLockAcquisition.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    ...input.resources.map(prop("label")),
    ...input.operations.map(prop("label")),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs: INVALID_INPUTS,
  contract: orderedLockAcquisitionContract,
  render: _render,
  excludedTextFields: [
    "id",
    "entityId",
    "requestedIds",
    "firstOperationId",
    "outcome",
    "rule",
    "nullPolicy",
    "replacement",
    "originalRows",
    "rows",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: options.contract,
  expectedTextPaths: [
    ["resources", 0, "label"],
    ["resources", 1, "label"],
    ["operations", 0, "label"],
    ["operations", 1, "label"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: FIXTURES.map(prop("input")),
});

test("request cards exchange positions without covering one another", () => {
  FIXTURES.forEach(({ input }) => {
    Array.from({ length: 149 }, (_, index) => 53 + index / 4).forEach(
      (frame) => {
        const cards = [
          ..._render({ frame: frame, input: input }).matchAll(
            /<rect data-request-tile="([^"]*)"[^>]*>/g,
          ),
        ].map(([attributes, id]) => ({
          id,
          x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
          y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
          width: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "width",
          }),
          height: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "height",
          }),
        }));
        assert.deepEqual(
          cards.map(prop("id")),
          input.operations.flatMap(prop("requestedIds")),
        );
        cards.forEach((first, index) =>
          cards
            .slice(index + 1)
            .forEach((second) =>
              assert.ok(
                first.x + first.width + 1 <= second.x ||
                  second.x + second.width + 1 <= first.x ||
                  first.y + first.height + 1 <= second.y ||
                  second.y + second.height + 1 <= first.y,
              ),
            ),
        );
      },
    );
  });
});
test("canonical sorting moves actual authored resource labels before any grant", () => {
  const positions = (frame: number) =>
    [
      ..._render({ frame: frame, input: DEFAULT_INPUT }).matchAll(
        /<rect data-request-tile="([^"]*)"([^>]*)>/g,
      ),
    ].map(([, id, attributes]) => [
      id,
      SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
    ]);
  assert.deepEqual(positions(40), [
    ["a", 340],
    ["b", 600],
    ["b", 340],
    ["a", 600],
  ]);
  assert.deepEqual(positions(90), [
    ["a", 340],
    ["b", 600],
    ["b", 600],
    ["a", 340],
  ]);
  [0, 40, 53, 70, 90].forEach((frame) =>
    assert.equal(
      [
        ..._render({ frame: frame, input: DEFAULT_INPUT }).matchAll(
          /data-key-owner="([^"]*)"/g,
        ),
      ].filter(([, owner]) => owner !== "").length,
      0,
    ),
  );
  assert.doesNotMatch(
    _render({
      frame: 90,
      input: { ...DEFAULT_INPUT, showOriginalOrder: false },
    }),
    /data-original-order=/,
  );
});
