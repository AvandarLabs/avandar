/** Behavioral scene, input, identity and geometry assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BenefitShortfallCorrection } from "./BenefitShortfallCorrection";
import {
  DEFAULT_INPUT,
  INVALID_INPUTS,
  fixtures,
} from "./BenefitShortfallCorrection.fixtures";
import { inputSchema, type Input } from "./BenefitShortfallCorrection.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(BenefitShortfallCorrection, {
      frame,
      input,
      accent: "#67e8c2",
      id: "test",
    }),
  );
}

test("five stated positions retain three originals one correction and one gap", () => {
  const setup = _render({ frame: 20 });
  const hold = _render({ frame: 150 });
  assert.equal((setup.match(/data-unit-kind="original"/g) || []).length, 3);
  assert.equal((hold.match(/data-unit-kind="original"/g) || []).length, 3);
  assert.equal((hold.match(/data-unit-kind="correction"/g) || []).length, 1);
  assert.equal((hold.match(/data-unit-kind="gap"/g) || []).length, 1);
  assert.equal((hold.match(/data-stated-slot=/g) || []).length, 5);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { benefitShortfallCorrectionContract as contract } from "./BenefitShortfallCorrection.contract";
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "permissionId",
  "projectId",
  "role",
  "kind",
  "before",
  "after",
  "participantResponse",
  "partition",
  "symbol",
  "tallyArrangement",
];
function _visible({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.exampleLabel,
    ...Object.values(input.people),
    input.unitLabel,
    ...Object.values(input.labels),
    ...input.payments.map(prop("label")),
  ];
}
function _escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract,
  invalidInputs: INVALID_INPUTS,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: ({ input, frame }) =>
    _visible({ input: input, frame: frame }).map(_escape),
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _visible,
});

test("zero full and concentrated corrections conserve every per-payment position", () => {
  [fixtures[1].input, fixtures[2].input, fixtures[3].input].forEach((input) => {
    const hold = _render({ frame: 150, input: input });
    input.payments.forEach((payment, index) => {
      const row = hold
        .split(`data-payment="${payment.id}"`)[1]
        .split("data-payment=")[0];
      const originals = (row.match(/data-unit-kind="original"/g) || []).length;
      const corrections = (row.match(/data-unit-kind="correction"/g) || [])
        .length;
      const gaps = (row.match(/data-unit-kind="gap"/g) || []).length;
      assert.deepEqual(
        [originals, corrections, gaps],
        [
          payment.receivedUnits,
          payment.correctionUnits,
          payment.statedUnits - payment.receivedUnits - payment.correctionUnits,
        ],
      );
      const tokens = [
        ...row.matchAll(/<circle data-payment-token="[^"]*"[^>]*>/g),
      ].map(([attributes]) => [
        SvgAttributes.getNumberFromMarkup({ attributes, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes, name: "cy" }),
      ]);
      assert.equal(
        new Set(tokens.map((point) => point.join(","))).size,
        tokens.length,
      );
      tokens.forEach(([x, y]) => {
        assert.ok(x - 18 > 268);
        assert.equal(y, 330 + index * 120);
        assert.ok(x + 18 < 868);
      });
    });
  });
});
test("worker hand reaches the actual correction token without duplicating it", () => {
  [72, 80, 96, 104].forEach((frame) => {
    const markup = _render({ frame: frame });
    const correction = markup.split('data-unit-kind="correction"')[1];
    assert.ok(
      markup.indexOf("data-correction-hand=") <
        markup.indexOf("data-quantity-total="),
      "quantity headings paint above the handling path",
    );
    const token = SvgAttributes.fromMarker({
      markup: correction,
      marker: "payment-token",
    });
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: token,
        name: "cx",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: token, name: "cy" });
    assert.ok(
      SvgAttributes.fromMarker({ markup, marker: "correction-hand" }).includes(
        `L${x} ${y - 18}`,
      ),
    );
  });
  const gapPoint = SvgAttributes.fromMarker({
    markup: _render({ frame: 65 }),
    marker: "gap-point",
  });
  assert.ok(gapPoint.includes("L534 330"));
});

test("quantity patterns keep their meaning when label object keys arrive reordered", () => {
  const labels = {
    unresolved: DEFAULT_INPUT.labels.unresolved,
    correction: DEFAULT_INPUT.labels.correction,
    received: DEFAULT_INPUT.labels.received,
    stated: DEFAULT_INPUT.labels.stated,
  };
  assert.equal(
    _render({ frame: 150, input: { ...DEFAULT_INPUT, labels } }),
    _render({ frame: 150 }),
  );
});
