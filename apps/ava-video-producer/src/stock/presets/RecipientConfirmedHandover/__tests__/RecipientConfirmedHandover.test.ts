import { RecipientConfirmedHandoverTestState } from "./RecipientConfirmedHandoverTestState";

const {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
} = RecipientConfirmedHandoverTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { recipientConfirmedHandoverContract } from "../RecipientConfirmedHandover.contract";
import {
  changedInput,
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  fixtures,
  invalidInputs,
} from "../RecipientConfirmedHandover.fixtures";
import { inputSchema } from "../RecipientConfirmedHandover.schema";
import { assertReceiptQuantitiesEqualCompletedInput as _assertReceiptQuantitiesEqualCompletedInput } from "./assertReceiptQuantitiesEqualCompletedInput";
import { assertRecipientIndicatesPullsReleasesInput as _assertRecipientIndicatesPullsReleasesInput } from "./assertRecipientIndicatesPullsReleasesInput";
import { registerRecipientActionAssertions } from "./registerRecipientActionAssertions";

test("changed recipient hold frame renders three basket and three delivery items with selected quantity two", () => {
  const markup = _render({ frame: 150, input: changedInput });
  assert.equal((markup.match(/data-owner="basket"/g) ?? []).length, 3);
  assert.equal((markup.match(/data-owner="delivery"/g) ?? []).length, 3);
  assert.match(markup, /data-selected="2"/);
});

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
    return _assertReceiptQuantitiesEqualCompletedInput(input);
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
      contents: DENSE_INPUT.contents.map((item) => {
        return { ...item, offeredUnits: 4 };
      }),
    },
    {
      ...DENSE_INPUT,
      contents: DENSE_INPUT.contents.map((item) => {
        return { ...item, selectedUnits: item.offeredUnits };
      }),
    },
  ];
  invalid.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

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
  ].forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("recipient indicates, pulls and releases each selected unit with a connected hand", () => {
  fixtures.forEach(({ input }) => {
    return _assertRecipientIndicatesPullsReleasesInput(input);
  });
});

test("recipient hand releases continuously before reaching for another selected unit", () => {
  Array.from(
    { length: Math.max(0, Math.ceil((5 - 1) / 1)) },
    (_, sampleIndex) => {
      return 1 + sampleIndex * 1;
    },
  ).forEach((ordinal) => {
    const boundary = 30 + ordinal * 14;
    const hands = [boundary - 0.001, boundary].map((frame) => {
      const hand = _render({ frame, input: DENSE_INPUT }).match(
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

registerRecipientActionAssertions(_render);
