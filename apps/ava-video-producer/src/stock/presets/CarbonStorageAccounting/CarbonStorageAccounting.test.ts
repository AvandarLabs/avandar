import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CarbonStorageAccounting } from "./CarbonStorageAccounting";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
  DENSE_INPUT,
  MINIMUM_INPUT,
} from "./CarbonStorageAccounting.fixtures";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(CarbonStorageAccounting, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
test("physical retained and separate net accounting preserve subtraction", () => {
  const markup = _render({ frame: 150 });
  assert.match(markup, /data-retained="11"/);
  assert.match(markup, /data-net="9"/);
  assert.match(markup, /data-emissions="2"/);
});

test("changed authored input emits its physical scene", () => {
  assert.notEqual(
    renderToStaticMarkup(
      createElement(CarbonStorageAccounting, {
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

test("negative, all-released, tiny positive and zero-operation inputs retain exact physical and signed accounting values", () => {
  fixtures.forEach(({ input }) => {
    const retained =
      input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
    const operations = input.operatingEmissions.reduce(
      (sum, row) => sum + row.tonnesCO2e,
      0,
    );
    const markup = _render({ frame: 150, input: input });
    const store = markup.match(/<g data-retained[^>]*>/);
    const emissions = markup.match(/<g data-emissions[^>]*>/);
    const net = markup.match(/<g data-net[^>]*>/);
    assert.ok(store && emissions);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: store[0],
        name: "data-retained",
      }),
      retained,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: emissions[0],
        name: "data-emissions",
      }),
      operations,
    );
    if (input.showNetAccounting) {
      assert.ok(net);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: net[0],
          name: "data-net",
        }),
        retained - operations,
      );
    }
    const hidden = _render({
      frame: 150,
      input: { ...input, showNetAccounting: false },
    });
    assert.doesNotMatch(hidden, /data-net=/);
    assert.match(hidden, /data-emissions/);
    assert.match(hidden, /data-boundary/);
    assert.notEqual(
      _render({ frame: 24, input: input }).match(
        /<path data-operator-arm[^>]*>/,
      )?.[0],
      _render({ frame: 52, input: input }).match(
        /<path data-operator-arm[^>]*>/,
      )?.[0],
    );
    assert.equal(
      (
        _render({ frame: 150, input: input }).match(
          /data-operation-ribbon=/g,
        ) ?? []
      ).length,
      input.operatingEmissions.length,
    );
    assert.match(markup, /data-retained-ribbon/);
    assert.match(markup, /data-released-ribbon/);
  });
  assert.match(_render({ frame: 150, input: CHANGED_INPUT }), /data-net="-6"/);
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { carbonStorageAccountingContract } from "./CarbonStorageAccounting.contract";
import { inputSchema, type Input } from "./CarbonStorageAccounting.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.boundary),
    ...Object.values(input.decision),
    ...input.operatingEmissions.map(prop("label")),
    ...Object.entries(input.copy).flatMap(([key, text]) =>
      key === "net" && (!input.showNetAccounting || frame < 108) ? [] : [text],
    ),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = ["id", "view"];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: carbonStorageAccountingContract,
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
test("zero operating emissions have no physical ribbon width and the operator contacts the valve", () => {
  const markup = _render({ frame: 150, input: MINIMUM_INPUT });
  const ribbon = markup.match(/<path data-operation-ribbon[^>]*>/);
  assert.ok(ribbon);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: ribbon[0],
      name: "stroke-width",
    }),
    0,
  );
  const cue = _render({ frame: 54 });
  const hand = cue.match(/<circle data-operator-hand[^>]*>/);
  const valve = cue.match(/<circle data-transfer-valve[^>]*>/);
  assert.ok(hand && valve);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
    SvgAttributes.getNumberFromMarkup({ attributes: valve[0], name: "cx" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
    SvgAttributes.getNumberFromMarkup({ attributes: valve[0], name: "cy" }),
  );
});
test("full finite signed equation values stay readable above the bracket and beside their operators", () => {
  fixtures
    .filter(({ input }) => input.showNetAccounting)
    .forEach(({ input }) => {
      const markup = _render({ frame: 150, input: input });
      const retained =
        input.capture.capturedTonnesCO2 - input.capture.releasedTonnesCO2;
      const emissions = input.operatingEmissions.reduce(
        (sum, row) => sum + row.tonnesCO2e,
        0,
      );
      [retained, emissions, retained - emissions].forEach((value, index) => {
        const cell = [...markup.matchAll(/<text ([^>]*)>(.*?)<\/text>/g)].find(
          (match) =>
            SvgAttributes.getNumberFromMarkup({
              attributes: match[1],
              name: "x",
            }) ===
              540 + index * 135 &&
            SvgAttributes.getNumberFromMarkup({
              attributes: match[1],
              name: "y",
            }) === 510,
        );
        assert.ok(cell);
        const spans = [
          ...cell[2].matchAll(/<tspan[^>]*dy="([^"]*)"[^>]*>([^<]*)<\/tspan>/g),
        ];
        assert.equal(spans.map((span) => span[2]).join(""), String(value));
        assert.ok(
          510 + spans.reduce((sum, span) => sum + Number(span[1]), 0) + 3.6 <
            550,
        );
      });
    });
});
test("physical separation starts after the operator cue and accounting follows the split", () => {
  const setup = _render({ frame: 24 });
  const retained = setup.match(/<path data-retained-ribbon[^>]*>/);
  const released = setup.match(/<path data-released-ribbon[^>]*>/);
  assert.ok(retained && released);
  assert.match(retained[0], /d="M260 360 V360 H260"/);
  assert.match(released[0], /d="M260 360 H260 V360"/);
  assert.doesNotMatch(setup, /data-net=/);
  assert.match(_render({ frame: 120 }), /data-net="9"/);
});

test("the precise captured quantity and unit sit beside the continuous physical pipe", async () => {
  const { CarbonPhysicalLabels } = await import("./CarbonPhysicalLabels");
  const { carbonStorageAccountingContract: correctionContract } =
    await import("./CarbonStorageAccounting.contract");
  const { SvgPaintAssertions } =
    await import("../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  [
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ].forEach((input) => {
    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
      renderToStaticMarkup(createElement(CarbonPhysicalLabels, { input })),
    );
    const captured = paint.filter(
      (item) =>
        item.kind === "text" &&
        item.top >= 374 &&
        item.bottom < 432 &&
        item.left < 248,
    );
    assert.ok(captured.length >= 2);
    captured.forEach((line) =>
      assert.ok(
        Math.abs(line.right - 236) < 1e-6,
        "Captured numerical copy stays beside the tower and clears the pipe at248",
      ),
    );
    assert.equal(
      paint.filter(propEq("kind", "rect")).length,
      0,
      "No broad backing erases the physical transfer",
    );
    SvgPaintAssertions.assertPaintClearance({
      texts: paint.filter(propEq("kind", "text")),
      rectangles: [],
    });
  });
});
