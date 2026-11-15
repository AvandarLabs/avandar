import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecipientConfirmedHandover } from "./RecipientConfirmedHandover";
import {
  changedInput,
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  fixtures,
  invalidInputs,
} from "./RecipientConfirmedHandover.fixtures";
import { inputSchema, type Input } from "./RecipientConfirmedHandover.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(RecipientConfirmedHandover, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("The basket and receipt equal the recipient's selected quantities; unselected goods remain on the table and no acknowledgement changes quantities.", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-owner="basket"/g) ?? []).length, 3);
  assert.equal((markup.match(/data-owner="delivery"/g) ?? []).length, 3);
  assert.match(markup, /data-selected="2"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { recipientConfirmedHandoverContract } from "./RecipientConfirmedHandover.contract";

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.scenarioCaption,
    ...Object.values(input.participantLabels),
    ...Object.values(input.receiptLabels),
    ...input.contents.map(prop("label")),
    ...(input.acknowledgementMark === "initials" ? [input.initialsText] : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "symbol",
  "acknowledgementMark",
  "initialsText",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: recipientConfirmedHandoverContract,
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

test("receipt quantities equal completed physical moves while each offered unit remains singular", () => {
  fixtures.forEach(({ input }) => {
    Array.from({ length: 90 }, (_, index) => index * 2).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const objects = [
        ...markup.matchAll(/<g data-good="([^"]*)" data-unit="([^"]*)"[^>]*>/g),
      ];
      assert.equal(
        objects.length,
        input.contents.reduce((sum, item) => sum + item.offeredUnits, 0),
      );
      input.contents.forEach((item) => {
        const units = objects.filter((match) => match[1] === item.id);
        assert.equal(units.length, item.offeredUnits);
        assert.equal(
          new Set(units.map((match) => match[2])).size,
          item.offeredUnits,
        );
        const received = units.filter(([attributes]) =>
          attributes.includes('data-owner="basket"'),
        ).length;
        assert.match(
          markup,
          new RegExp(`data-receipt="${item.id}" data-selected="${received}"`),
        );
        if (frame >= 108) {
          assert.equal(received, item.selectedUnits);
          assert.equal(
            units.filter(([attributes]) =>
              attributes.includes('data-owner="delivery"'),
            ).length,
            item.offeredUnits - item.selectedUnits,
          );
        }
        units.forEach(([attributes]) => {
          const x = _getUnitCoordinate({ attributes, axis: "x" });
          assert.ok(x - 12 >= 193 && x + 12 <= 650);
        });
      });
    });
  });
});
test("selection cannot exceed line availability or accepted aggregate limits", () => {
  const invalid = [
    {
      ...MINIMUM_INPUT,
      contents: [{ ...MINIMUM_INPUT.contents[0], selectedUnits: 0 }],
    },
    {
      ...MINIMUM_INPUT,
      contents: [{ ...MINIMUM_INPUT.contents[0], selectedUnits: 2 }],
    },
    {
      ...DENSE_INPUT,
      contents: DENSE_INPUT.contents.map((item) => ({
        ...item,
        offeredUnits: 4,
      })),
    },
    {
      ...DENSE_INPUT,
      contents: DENSE_INPUT.contents.map((item) => ({
        ...item,
        selectedUnits: item.offeredUnits,
      })),
    },
  ];
  invalid.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

function _getUnitCoordinate({
  attributes,
  axis,
}: Readonly<{ attributes: string; axis: "x" | "y" }>): number {
  const transform = attributes.match(
    /transform="translate\(([^ ]+) ([^)]+)\)"/,
  );
  assert.ok(transform);
  return Number(transform[axis === "x" ? 1 : 2]);
}

test("unknown goods, fractional quantities and invalid initials fail strict validation", () => {
  [
    {
      ...DEFAULT_INPUT,
      contents: [{ ...DEFAULT_INPUT.contents[0], offeredUnits: 1.5 }],
    },
    {
      ...DEFAULT_INPUT,
      contents: [{ ...DEFAULT_INPUT.contents[0], symbol: "unknown" }],
    },
    {
      ...DEFAULT_INPUT,
      receiptLabels: { ...DEFAULT_INPUT.receiptLabels, extra: true },
    },
    { ...DEFAULT_INPUT, initialsText: "abcd" },
  ].forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});

test("recipient indicates, pulls and releases each selected unit with a connected hand", () => {
  fixtures.forEach(({ input }) => {
    let ordinal = 0;
    input.contents.forEach((content) => {
      Array.from(
        { length: Math.max(0, Math.ceil((content.selectedUnits - 0) / 1)) },
        (_, sampleIndex) => 0 + sampleIndex * 1,
      ).forEach((unit) => {
        const frame = 39 + ordinal * 14;
        const markup = _render({ frame: frame, input: input });
        const hand = markup.match(/<circle data-recipient-hand[^>]*>/);
        const arm = markup.match(/<path data-recipient-arm[^>]*>/);
        const item = [
          ...markup.matchAll(
            /<g data-good="([^"]*)" data-unit="([^"]*)"[^>]*>/g,
          ),
        ].find((match) => match[1] === content.id && Number(match[2]) === unit);
        assert.ok(hand, "the recipient must pull the counted unit");
        assert.ok(arm && /d="M[^"]+ L[^"]+ L/.test(arm[0]));
        assert.ok(item);
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: hand[0],
            name: "cx",
          }),
          _getUnitCoordinate({ attributes: item[0], axis: "x" }) + 12,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: hand[0],
            name: "cy",
          }),
          _getUnitCoordinate({ attributes: item[0], axis: "y" }),
        );
        assert.notEqual(
          _render({ frame: frame - 7, input: input }).match(
            /<circle data-recipient-hand[^>]*>/,
          )?.[0],
          hand[0],
        );
        assert.notEqual(
          _render({ frame: frame + 7, input: input }).match(
            /<circle data-recipient-hand[^>]*>/,
          )?.[0],
          hand[0],
        );
        ordinal += 1;
      });
    });
  });
});

test("recipient hand releases continuously before reaching for another selected unit", () => {
  Array.from(
    { length: Math.max(0, Math.ceil((5 - 1) / 1)) },
    (_, sampleIndex) => 1 + sampleIndex * 1,
  ).forEach((ordinal) => {
    const boundary = 30 + ordinal * 14;
    const hands = [boundary - 0.001, boundary].map((frame) => {
      const hand = _render({ frame: frame, input: DENSE_INPUT }).match(
        /<circle data-recipient-hand[^>]*>/,
      );
      assert.ok(hand);
      return [
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
      ];
    });
    assert.ok(
      Math.hypot(hands[1][0] - hands[0][0], hands[1][1] - hands[0][1]) < 1,
      "the hand must not jump from the carried unit to a resting pose",
    );
  });
});

import { registerRecipientActionAssertions } from "./registerRecipientActionAssertions";

registerRecipientActionAssertions(_render);
