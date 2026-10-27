import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import acceptedAdditions from "../../docs/motion-atlas/catalog-expansion.json";
import { STOCK_IDS } from "./catalog";
import { parseStockInput } from "./contracts/parseStockInput/parseStockInput";
import { StockCopyMessages } from "./i18n/StockCopyMessages";
import { stockI18n } from "./i18n/stockI18n/stockI18n";
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

test("omitted ledger input decodes translated spans while supplied markers remain literal", () => {
  const preset = "prose-measurement-ledger";
  const locale = stockI18n.locale;
  stockI18n.load("span-integration", {
    [StockCopyMessages.getDefaultMessageIdFromPath({
      id: preset,
      path: ["fragments", 0, "text"],
    })]: "À <content>é👩‍🔬</content> ",
  });
  stockI18n.activate("span-integration");
  try {
    const omitted = parseStockInput({ preset });
    assert.deepEqual(
      [
        omitted.fragments[0].text,
        omitted.fragments[0].contentStart,
        omitted.fragments[0].contentEnd,
      ],
      ["À é👩‍🔬 ", 2, 9],
    );
    const markup = renderToStaticMarkup(
      createElement(StockGraphic, { preset, frame: 150 }),
    );
    assert.match(markup, /data-role="subject" data-value="é👩‍🔬"/);
    const supplied = structuredClone(stockContracts[preset].defaultInput);
    Object.assign(supplied.fragments[0], {
      text: "<content>Lieu</content> ",
      contentStart: 9,
      contentEnd: 13,
    });
    assert.deepEqual(parseStockInput({ preset, rawInput: supplied }), supplied);
  } finally {
    stockI18n.activate(locale);
  }
});
