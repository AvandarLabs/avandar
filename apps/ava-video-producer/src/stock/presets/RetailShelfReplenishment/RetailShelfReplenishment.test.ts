import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RetailShelfReplenishment } from "./RetailShelfReplenishment";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "./RetailShelfReplenishment.fixtures";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(RetailShelfReplenishment, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("closing shelf and basket conserve each authored product", () => {
  const markup = _render({ frame: 150 });
  DEFAULT_INPUT.goods.forEach((good) => {
    const units = [
      ...markup.matchAll(
        /<g data-good="([^"]*)" data-unit="[^"]*" data-owner="([^"]*)"/g,
      ),
    ].filter((match) => match[1] === good.id);
    assert.equal(
      units.filter((match) => match[2] === "shelf").length,
      good.openingUnits + good.incomingUnits - good.selectedUnits,
    );
    assert.equal(
      units.filter((match) => match[2] === "basket").length,
      good.selectedUnits,
    );
  });
});

test("changed authored input emits its physical scene", () => {
  assert.notEqual(
    renderToStaticMarkup(
      createElement(RetailShelfReplenishment, {
        frame: 150,
        input: CHANGED_INPUT,
        accent: "#9fefca",
        id: "test",
      }),
    ),
    "",
  );
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";

test("changed zero-opening purchase leaves exactly zero stock and three basket units", () => {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  assert.equal((markup.match(/data-owner="shelf"/g) ?? []).length, 0);
  assert.equal((markup.match(/data-owner="basket"/g) ?? []).length, 3);
});
test("every physical unit stays unique and handled units contact the active actor hand", () => {
  fixtures.forEach(({ input }) =>
    Array.from({ length: 180 }, (_, frame) => frame).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const units = [
        ...markup.matchAll(
          /<g data-good="([^"]*)" data-unit="([^"]*)" data-owner="([^"]*)"[^>]*transform="translate\(([^ ]+) ([^)]+)\)"/g,
        ),
      ];
      assert.equal(
        units.length,
        input.goods.reduce(
          (sum, good) => sum + good.openingUnits + good.incomingUnits,
          0,
        ),
      );
      assert.equal(
        new Set(units.map((unit) => `${unit[1]}:${unit[2]}`)).size,
        units.length,
      );
      units
        .filter(
          (unit) => unit[3] === "retailer-hand" || unit[3] === "shopper-hand",
        )
        .forEach((unit) => {
          const hand = markup.match(
            new RegExp(`<circle data-${unit[3]}[^>]*>`),
          );
          assert.ok(hand);
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: hand[0],
              name: "cx",
            }),
            Number(unit[4]) + 12,
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: hand[0],
              name: "cy",
            }),
            Number(unit[5]),
          );
        });
      if (frame === 150) {
        input.goods.forEach((good) => {
          const own = units.filter((unit) => unit[1] === good.id);
          assert.equal(
            own.filter((unit) => unit[3] === "shelf").length,
            good.openingUnits + good.incomingUnits - good.selectedUnits,
          );
          assert.equal(
            own.filter((unit) => unit[3] === "basket").length,
            good.selectedUnits,
          );
        });
      }
    }),
  );
});
test("retailer points and orders before a loaded carrier arrives, then shopper selects", () => {
  const pointing = _render({ frame: 24 });
  const ordering = _render({ frame: 34 });
  const loading = _render({ frame: 61 });
  const choosing = _render({ frame: 100 });
  assert.notEqual(
    pointing.match(/<path data-retailer-arm[^>]*>/)?.[0],
    ordering.match(/<path data-retailer-arm[^>]*>/)?.[0],
  );
  assert.match(ordering, /data-order-slip/);
  assert.match(loading, /data-owner="retailer-hand"/);
  assert.match(choosing, /data-owner="shopper-hand"/);
  assert.notEqual(
    _render({ frame: 40 }).match(/<g data-carrier[^>]*>/)?.[0],
    _render({ frame: 54 }).match(/<g data-carrier[^>]*>/)?.[0],
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: CHANGED_INPUT }),
    /data-order-slip|data-quantity/,
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { retailShelfReplenishmentContract } from "./RetailShelfReplenishment.contract";
import { inputSchema, type Input } from "./RetailShelfReplenishment.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.scenarioCaption,
    ...input.goods.map(prop("label")),
    ...Object.entries(input.labels).flatMap(([key, text]) =>
      key === "order" && !input.showOrderSlip ? [] : [text],
    ),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "symbol", "deliveryMode"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: retailShelfReplenishmentContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
test("minimum empty identifiers and maximum accepted collections stay schema-valid", () => {
  assert.deepEqual(inputSchema.parse(MINIMUM_INPUT), MINIMUM_INPUT);
  assert.deepEqual(inputSchema.parse(DENSE_INPUT), DENSE_INPUT);
});
test("displayed quantity follows the actual shelf at every handoff frame", () => {
  fixtures
    .filter(({ input }) => input.showQuantityLabels)
    .forEach(({ input }) =>
      Array.from({ length: 180 }, (_, frame) => frame).forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        input.goods.forEach((good) => {
          const own = [
            ...markup.matchAll(
              /<g data-good="([^"]*)" data-unit="[^"]*" data-owner="([^"]*)"/g,
            ),
          ].filter((unit) => unit[1] === good.id && unit[2] === "shelf").length;
          const label = [
            ...markup.matchAll(
              /<text data-quantity="([^"]*)"[^>]*>([^<]*)<\/text>/g,
            ),
          ].find((candidate) => candidate[1] === good.id);
          assert.ok(label);
          assert.equal(Number(label[2]), own);
        });
      }),
    );
});
test("retailer points to the actual first incoming shelf gap", () => {
  fixtures.forEach(({ input }) => {
    const index = input.goods.findIndex((good) => good.incomingUnits > 0);
    const hand = _render({ frame: 24, input: input }).match(
      /<circle data-retailer-hand[^>]*>/,
    );
    assert.ok(hand);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
      192 + input.goods[index].openingUnits * 56,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
      200 + index * 105,
    );
  });
});
test("I1 retailer grips the emitted slip throughout its moving placement", () => {
  fixtures
    .filter(({ input }) => input.showOrderSlip)
    .forEach(({ input }) => {
      Array.from({ length: 9 }, (_, offset) => 28 + offset).forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const slip = markup.match(
          /data-order-slip[^>]*transform="translate\(([^ ]+) ([^)]+)\)"/,
        );
        const hand = markup.match(/<circle data-retailer-hand[^>]*>/);
        assert.ok(slip && hand);
        const handX = SvgAttributes.getNumberFromMarkup({
            attributes: hand[0],
            name: "cx",
          }),
          handY = SvgAttributes.getNumberFromMarkup({
            attributes: hand[0],
            name: "cy",
          });
        assert.ok(
          handX >= Number(slip[1]) && handX <= Number(slip[1]) + 72,
          `slip not held at frame ${frame}`,
        );
        assert.ok(
          handY >= Number(slip[2]) && handY <= Number(slip[2]) + 24,
          `slip not held vertically at frame ${frame}`,
        );
      });
    });
});
