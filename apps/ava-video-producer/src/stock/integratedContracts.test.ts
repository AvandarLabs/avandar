import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import acceptedAdditions from "../../docs/motion-atlas/catalog-expansion.json";
import { STOCK_IDS } from "./catalog";
import { parseStockInput } from "./contracts/parseStockInput/parseStockInput";
import { stockContracts } from "./registry/stockContracts";
import { StockGraphic } from "./StockGraphic";

test("the integrated additions preserve every independent accepted default", () => {
  acceptedAdditions.forEach(({ id, inputs }) => {
    const preset = STOCK_IDS.find((candidate) => candidate === id);
    assert.ok(preset, id);
    assert.deepEqual(
      stockContracts[preset].defaultInput,
      Object.fromEntries(inputs.map((input) => [input.name, input.default])),
      id,
    );
  });
});

test("every integrated fixture and binding remains complete accepted input", () => {
  STOCK_IDS.forEach((preset) => {
    const contract = stockContracts[preset];
    [...contract.fixtures, ...contract.bindingExamples].forEach(({ input }) => {
      assert.deepEqual(
        parseStockInput({ preset, rawInput: input }),
        input,
        preset,
      );
    });
  });
});

test("omitted ledger input keeps its English default span while supplied markers remain literal", () => {
  const preset = "prose-measurement-ledger";
  const { defaultInput } = stockContracts[preset];
  const omitted = parseStockInput({ preset });
  assert.deepEqual(omitted, defaultInput);
  assert.notEqual(omitted, defaultInput);
  const markup = renderToStaticMarkup(
    createElement(StockGraphic, { preset, frame: 150 }),
  );
  const [first] = defaultInput.fragments;
  assert.ok(
    markup.includes(
      `data-role="subject" data-value="${first.text.slice(first.contentStart, first.contentEnd)}"`,
    ),
  );
  const supplied = structuredClone(defaultInput);
  Object.assign(supplied.fragments[0], {
    text: "<content>Lieu</content> ",
    contentStart: 9,
    contentEnd: 13,
  });
  assert.deepEqual(parseStockInput({ preset, rawInput: supplied }), supplied);
});
