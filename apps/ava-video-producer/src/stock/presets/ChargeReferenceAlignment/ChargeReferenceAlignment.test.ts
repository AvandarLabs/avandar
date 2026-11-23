/**
 * Behavioral checks preserve authored identity, exact quantities and choices.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChargeReferenceAlignment } from "./ChargeReferenceAlignment";
import {
  DEFAULT_INPUT,
  MINIMUM_INPUT,
  DENSE_INPUT,
  CHANGED_INPUT,
  fixtures,
} from "./ChargeReferenceAlignment.fixtures";
import { inputSchema, type Input } from "./ChargeReferenceAlignment.schema";
import { INVALID_INPUTS } from "./rejectedInputs.constants";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(ChargeReferenceAlignment, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

test("exact context gates signed difference and both totals share one zero and currency scale", () => {
  const after = _render({ frame: 150 });
  assert.match(after, /data-difference-minor="2400"/);
  assert.match(after, /data-total-minor="8400"/);
  assert.match(after, /data-total-minor="6000"/);
  assert.doesNotMatch(
    _render({ frame: 150, input: CHANGED_INPUT }),
    /data-difference-minor=|data-difference-bracket=/,
  );
  assert.match(
    _render({ frame: 150, input: MINIMUM_INPUT }),
    /data-difference-minor="0"/,
  );
  assert.doesNotMatch(_render({ frame: 50 }), /data-difference-bracket=/);
});

test("complete fixture set includes minimum, dense and changed inputs before behavior", () => {
  [DEFAULT_INPUT, MINIMUM_INPUT, DENSE_INPUT, CHANGED_INPUT].forEach(
    (input) => {
      return assert.deepEqual(inputSchema.parse(input), input);
    },
  );
  assert.equal(fixtures.length, 4);
});
test("invalid structure and cross-field values are rejected", () => {
  INVALID_INPUTS.forEach((input) => {
    return assert.equal(inputSchema.safeParse(input).success, false);
  });
});

test("source-role captions accept 32 characters and reject 33", () => {
  ["invoice", "reference"].forEach((field) => {
    assert.equal(
      inputSchema.safeParse({
        ...DEFAULT_INPUT,
        copy: { ...DEFAULT_INPUT.copy, [field]: "W".repeat(32) },
      }).success,
      true,
    );
    assert.equal(
      inputSchema.safeParse({
        ...DEFAULT_INPUT,
        copy: { ...DEFAULT_INPUT.copy, [field]: "W".repeat(33) },
      }).success,
      false,
    );
  });
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { chargeReferenceAlignmentContract } from "./ChargeReferenceAlignment.contract";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  const keys = [
    "procedureCode",
    "providerKey",
    "payerKey",
    "periodLabel",
  ] as const;
  const isMatched =
    keys.every((key) => {
      return input.invoice[key] === input.reference[key];
    }) && input.invoice.quantity === input.reference.quantity;
  return [
    input.copy.invoice,
    input.copy.reference,
    input.copy.procedure,
    input.copy.provider,
    input.copy.payer,
    input.copy.period,
    input.copy.quantity,
    input.copy.review,
    input.copy.example,
    input.reference.sourceLabel,
    input.money.currencyLabel,
    ...keys.flatMap((key) => {
      return [input.invoice[key], input.reference[key]];
    }),
    isMatched ? input.copy.matched : input.copy.unmatched,
    ...(isMatched && input.showDifference && frame >= 71
      ? [input.copy.difference]
      : []),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["focus"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs: INVALID_INPUTS,
  contract: chargeReferenceAlignmentContract,
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

import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";

test("every independent context mismatch suppresses numeric and physical discrepancy", () => {
  const cases = [
    { procedureCode: "demo-p1" },
    { providerKey: "Demo clinic A " },
    { payerKey: "Demo plan R" },
    { periodLabel: "Demo period B" },
    { quantity: 2 },
  ];
  cases.forEach((change) => {
    const input = {
      ...DEFAULT_INPUT,
      reference: { ...DEFAULT_INPUT.reference, ...change },
      focus: "amounts" as const,
    };
    [70, 71, 100, 125, 167].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      assert.doesNotMatch(
        markup,
        /data-difference-minor=|data-difference-bracket=/,
      );
      assert.equal((markup.match(/data-mismatch-notch=/g) ?? []).length, 1);
    });
  });
});
test("zero, equal, positive and negative totals use exact shared ruler geometry", () => {
  structuredClone(ZERO_EQUAL_POSITIVE_AND_NEGATIVE_TOTALS_USE_CASES).forEach(
    (row) => {
      const input = {
        ...DEFAULT_INPUT,
        invoice: {
          ...DEFAULT_INPUT.invoice,
          quantity: row.quantity ?? 1,
          unitPriceMinor: row.billed,
        },
        reference: {
          ...DEFAULT_INPUT.reference,
          quantity: row.quantity ?? 1,
          unitPriceMinor: row.reference,
        },
      };
      const markup = _render({ frame: 150, input: input });
      assert.match(
        markup,
        new RegExp(`data-difference-minor="${row.difference}"`),
      );
      const rulers = [
        ...markup.matchAll(/<rect\b[^>]*\bdata-amount-ruler[^>]*>/g),
      ];
      _assertRulersShareOrigin(rulers);
      rulers.forEach((ruler, index) => {
        return assert.ok(
          Math.abs(
            SvgAttributes.getNumberFromMarkup({
              attributes: ruler[0],
              name: "width",
            }) - row.widths[index],
          ) < 1e-10,
        );
      });
      assert.doesNotMatch(
        _render({ frame: 150, input: { ...input, showDifference: false } }),
        /data-difference-minor=|data-difference-bracket=/,
      );
    },
  );
});
test("full literal context values fit inside their actual source windows", () => {
  const keys = {
    procedureCode: "界".repeat(14),
    providerKey: "界".repeat(22),
    payerKey: "界".repeat(22),
    periodLabel: "界".repeat(20),
  };
  const input = {
    ...DENSE_INPUT,
    invoice: { ...DENSE_INPUT.invoice, ...keys },
    reference: { ...DENSE_INPUT.reference, ...keys },
  };
  const markup = _render({ frame: 150, input: input });
  const literalTexts = [
    ...markup.matchAll(/<text[^>]*data-literal-value="([^"]*)"[^>]*>/g),
  ];
  const windows = [
    ...markup.matchAll(/<rect data-(?:invoice|reference)-window[^>]*>/g),
  ];
  const fields = [
    "procedureCode",
    "providerKey",
    "payerKey",
    "periodLabel",
    "quantity",
  ] as const;
  assert.deepEqual(
    literalTexts.map((text) => {
      return text[1];
    }),
    fields.flatMap((field) => {
      return [String(input.invoice[field]), String(input.reference[field])];
    }),
  );
  assert.equal(windows.length, fields.length * 2);
  _assertContextWindowFields({ windows, fields });
  _assertLiteralTextFitsWindows({ literalTexts, windows });
});

import { getTextEnvelopesFromMarkup } from "../SchemaColumnEvolution/getTextEnvelopesFromMarkup";

function _assertContextWindowFields({
  windows,
  fields,
}: Readonly<{
  windows: readonly RegExpMatchArray[];
  fields: readonly string[];
}>): void {
  assert.deepEqual(
    windows.map(([window]) => {
      return window
        .match(/data-(invoice|reference)-window="([^"]*)"/)!
        .slice(1);
    }),
    fields.flatMap((field) => {
      return [
        ["invoice", field],
        ["reference", field],
      ];
    }),
  );
}

function _assertLiteralTextFitsWindows({
  literalTexts,
  windows,
}: Readonly<{
  literalTexts: readonly RegExpMatchArray[];
  windows: readonly RegExpMatchArray[];
}>): void {
  literalTexts.forEach((text, index) => {
    const left = SvgAttributes.getNumberFromMarkup({
      attributes: text[0],
      name: "x",
    });
    const rectangle = windows[index][0];
    assert.ok(
      left + getConservativeWidthFromText({ text: text[1], fontSize: 12 }) <=
        SvgAttributes.getNumberFromMarkup({
          attributes: rectangle,
          name: "x",
        }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle,
            name: "width",
          }) -
          5,
    );
  });
}

function _assertRulersShareOrigin(rulers: readonly RegExpMatchArray[]): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: rulers[0][0],
      name: "x",
    }),
    SvgAttributes.getNumberFromMarkup({
      attributes: rulers[1][0],
      name: "x",
    }),
  );
}

const ZERO_EQUAL_POSITIVE_AND_NEGATIVE_TOTALS_USE_CASES = [
  { billed: 0, reference: 0, difference: 0, widths: [0, 0] },
  { billed: 60, reference: 60, difference: 0, widths: [600, 600] },
  { billed: 84, reference: 60, difference: 24, widths: [600, 3000 / 7] },
  { billed: 60, reference: 84, difference: -24, widths: [3000 / 7, 600] },
  {
    billed: 1000000,
    reference: 0,
    difference: 5000000,
    widths: [600, 0],
    quantity: 5,
  },
];

test("wrapped source captions clear actual context windows and currency clears amounts", () => {
  const input = {
    ...DENSE_INPUT,
    copy: {
      ...DENSE_INPUT.copy,
      invoice: "界".repeat(32),
      reference: "W".repeat(32),
    },
    money: { ...DENSE_INPUT.money, currencyLabel: `界 ${"界".repeat(14)} 界` },
  };
  const markup = _render({ frame: 150, input: input });
  const texts = getTextEnvelopesFromMarkup(markup);
  [input.copy.invoice, input.copy.reference].forEach((label) => {
    const caption = texts.find(propEq("label", label))!;
    assert.ok(
      caption.bottom + 4 <
        SvgAttributes.getNumberFromMarkup({
          attributes: markup.match(
            /<rect\b[^>]*\bdata-invoice-window[^>]*>/,
          )![0],
          name: "y",
        }),
    );
  });
  const currency = texts.find(propEq("label", input.money.currencyLabel))!;
  const amount = texts.find((text) => {
    return text.x === 60 && text.y === 430;
  })!;
  assert.ok(currency.bottom + 4 <= amount.top);
});
