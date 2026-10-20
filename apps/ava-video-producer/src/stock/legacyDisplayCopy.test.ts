import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import copy from "../../tests/fixtures/legacyDisplayCopy.json";
import { LEGACY_IDS } from "../../tests/fixtures/legacyStockIds";
import { StockCopyMessages } from "./i18n/StockCopyMessages";
import { stockI18n } from "./i18n/stockI18n/stockI18n";
import { stockContracts } from "./registry/stockContracts";
import { stockRenderers } from "./registry/stockRenderers/stockRenderers";
import { StockGraphic } from "./StockGraphic";

test("fixed legacy display units enter the canonical renderer-free message catalog", () => {
  const messages = StockCopyMessages.getMessagesFromContract(stockContracts);
  copy.forEach(({ id, message }) => assert.equal(messages[id], message, id));
  assert.equal(
    messages["motionAtlas.graphic.description"],
    "{preset}, conceptual motion graphic",
  );
});
test("synthetic translations reach every legacy display sink while supplied content stays exact", () => {
  stockI18n.load(
    "display-test",
    Object.fromEntries(
      copy.map(({ id, message }, index) => [
        id,
        [`translated-${index} ${message}`],
      ]),
    ),
  );
  stockI18n.activate("display-test");
  try {
    LEGACY_IDS.forEach((preset) => {
      const input = structuredClone(stockContracts[preset].defaultInput);
      const before = structuredClone(input);
      const markup = [0, 150]
        .map((frame) =>
          renderToStaticMarkup(
            createElement(
              "svg",
              {},
              stockRenderers[preset](
                {
                  frame,
                  accent: "#9fefca",
                  background: "#0b1219",
                  id: "display-copy",
                },
                input,
              ),
            ),
          ),
        )
        .join("");
      copy.forEach((entry, index) => {
        if (entry.preset === preset) {
          assert.ok(markup.includes(`translated-${index} `), entry.id);
        }
      });
      assert.deepEqual(input, before);
    });
  } finally {
    stockI18n.activate("en");
  }
});
test("the shared accessible description translates its prose without changing preset identity", () => {
  stockI18n.load("description-test", {
    "motionAtlas.graphic.description": ["Graphic: {preset}"],
  });
  stockI18n.activate("description-test");
  try {
    const markup = renderToStaticMarkup(
      createElement(StockGraphic, {
        preset: "network-graph",
        frame: 90,
        input: stockContracts["network-graph"].defaultInput,
      }),
    );
    assert.match(markup, /aria-label="Graphic: network graph"/);
  } finally {
    stockI18n.activate("en");
  }
});
