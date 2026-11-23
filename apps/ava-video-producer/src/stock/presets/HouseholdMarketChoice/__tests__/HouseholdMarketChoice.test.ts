import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { HouseholdMarketChoice } from "../HouseholdMarketChoice";
import { householdMarketChoiceContract } from "../HouseholdMarketChoice.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  DENSE_INPUT,
  fixtures,
  invalidInputs,
} from "../HouseholdMarketChoice.fixtures";
import { inputSchema, type Input } from "../HouseholdMarketChoice.schema";
import { registerMarketActionAssertions } from "./registerMarketActionAssertions";

function _assertBasketTotals(input: Readonly<Input>): void {
  const price = input.products.filter(prop("chosen")).reduce((sum, item) => {
    return sum + item.price;
  }, 0);
  const final = _render({ frame: 150, input });
  assert.match(final, new RegExp(`data-total="${price}"`));
  if (input.showRemainingBalance) {
    assert.match(
      final,
      new RegExp(`data-balance="${input.availableCredits - price}"`),
    );
  }
}

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(HouseholdMarketChoice, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

test("changed market hold frame has two basket items and zero remaining balance", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-owner="basket"/g) ?? []).length, 2);
  assert.match(markup, /data-balance="0"/);
});

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.scenarioCaption,
    ...input.products.map(prop("label")),
    ...Object.entries(input.labels).flatMap(([key, label]) => {
      return key === "remaining" && !input.showRemainingBalance ? [] : [label];
    }),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = ["id", "symbol", "tender"];

registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: householdMarketChoiceContract,
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

test("only chosen physical products leave the shelf and their journey clears participant labels", () => {
  fixtures.forEach(({ input }) => {
    Array.from({ length: 180 }, (_, index) => {
      return index * 1;
    }).forEach((frame) => {
      const markup = _render({ frame, input });
      const products = [...markup.matchAll(/<g data-product="([^"]*)"[^>]*>/g)];
      assert.equal(products.length, input.products.length);
      products.forEach(([attributes, productId], index) => {
        const product = input.products.find(propEq("id", productId))!;
        const x = _getProductCoordinate({ attributes, axis: "x" });
        const y = _getProductCoordinate({ attributes, axis: "y" });
        if (!product.chosen) {
          assert.equal(x, 120 + index * 176);
          assert.equal(y, 260);
        }
        if (y + 24 > 326 && y - 24 < 385) {
          assert.ok(
            x - 23 >= 275 && x + 23 <= 700,
            `product overlaps role copy at ${x},${y}, frame ${frame}`,
          );
        }
        if (frame >= 108) {
          assert.ok(
            attributes.includes(
              `data-owner="${product.chosen ? "basket" : "shelf"}"`,
            ),
          );
        }
      });
    });
    _assertBasketTotals(input);
  });
});

test("exact spending and thirty available credits remain valid while unaffordable baskets fail", () => {
  assert.equal(inputSchema.safeParse(DENSE_INPUT).success, true);
  assert.equal(inputSchema.safeParse(changedInput).success, true);
  assert.equal(
    inputSchema.safeParse({ ...DENSE_INPUT, availableCredits: 26 }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({
      ...DENSE_INPUT,
      products: DENSE_INPUT.products.map((item) => {
        return { ...item, chosen: true };
      }),
    }).success,
    false,
  );
});

test("retained demo credits remain beside the household after payment", () => {
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  const balance = markup.match(/<text data-retained-credits="3"[^>]*>/);
  assert.ok(balance);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: balance[0], name: "x" }) <
      280,
  );
});

function _getProductCoordinate({
  attributes,
  axis,
}: Readonly<{ attributes: string; axis: "x" | "y" }>): number {
  const transform = attributes.match(
    /transform="translate\(([^ ]+) ([^)]+)\)"/,
  );
  assert.ok(transform);
  return Number(transform[axis === "x" ? 1 : 2]);
}

test("unselected and duplicate-ID baskets, fractional prices and extra label keys fail", () => {
  [
    {
      ...DEFAULT_INPUT,
      products: DEFAULT_INPUT.products.map((item) => {
        return { ...item, chosen: false };
      }),
    },
    {
      ...DEFAULT_INPUT,
      products: DEFAULT_INPUT.products.map((item) => {
        return { ...item, id: "" };
      }),
    },
    {
      ...DEFAULT_INPUT,
      products: DEFAULT_INPUT.products.map((item) => {
        return { ...item, price: 1.5 };
      }),
    },
    { ...DEFAULT_INPUT, labels: { ...DEFAULT_INPUT.labels, extra: true } },
  ].forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("shopper reaches only for chosen products, carries them by hand and releases them", () => {
  fixtures.forEach(({ input }) => {
    const selected = input.products.filter(prop("chosen"));
    selected.forEach((product, ordinal) => {
      const start = 34 + ordinal * 24;
      const before = _render({ frame: start - 2, input });
      const during = _render({ frame: start + 9, input });
      const released = _render({ frame: start + 19, input });
      const hand = during.match(/<circle\b[^>]*\bdata-market-hand[^>]*>/);
      const arm = during.match(/<path\b[^>]*\bdata-market-arm[^>]*>/);
      const item = [
        ...during.matchAll(/<g data-product="([^"]*)"[^>]*>/g),
      ].find((match) => {
        return match[1] === product.id;
      });
      assert.ok(hand, "the shopper must visibly hold each chosen product");
      assert.ok(arm && /d="M[^"]+ L[^"]+ L/.test(arm[0]));
      assert.ok(item);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
        _getProductCoordinate({ attributes: item[0], axis: "x" }) + 23,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
        _getProductCoordinate({ attributes: item[0], axis: "y" }),
      );
      assert.notEqual(
        before.match(/<circle\b[^>]*\bdata-market-hand[^>]*>/)?.[0],
        hand[0],
      );
      assert.notEqual(
        released.match(/<circle\b[^>]*\bdata-market-hand[^>]*>/)?.[0],
        hand[0],
      );
    });
  });
});

registerMarketActionAssertions(_render);

test("the shopper holds the authored tender in the free hand while choosing products", () => {
  fixtures.forEach(({ input }) => {
    const markup = _render({ frame: 43, input });
    const arm = markup.match(
      /<path\b(?=[^>]*\bdata-market-arm)[^>]*\sd="M([^ ]+) ([^ ]+)/,
    );
    const tender = markup.match(
      /<g data-tender="[^"]*"[^>]*transform="translate\(([^ ]+) ([^)]+)\)"/,
    );
    assert.ok(arm && tender);
    assert.equal(Number(tender[1]), Number(arm[1]) + 45);
    assert.equal(Number(tender[2]), Number(arm[2]) + 10);
  });
});
