import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import copy from "../../tests/fixtures/legacyDisplayCopy.json";
import { stockContracts } from "./registry/stockContracts";
import { StockGraphic } from "./StockGraphic";
import type { StockContract } from "./contracts/StockContract.types";

test("fixed legacy display units keep their authored English copy", () => {
  const contracts: Record<string, StockContract<unknown>> = stockContracts;
  const messages = Object.fromEntries(
    Object.values(contracts).flatMap((contract) =>
      Object.values(contract.displayCopy ?? {}).map(
        ({ id, message }) => [id, message] as const,
      ),
    ),
  );
  copy.forEach(({ id, message }) => assert.equal(messages[id], message, id));
});
test("the shared accessible description names the preset", () => {
  const markup = renderToStaticMarkup(
    createElement(StockGraphic, {
      preset: "network-graph",
      frame: 90,
      input: stockContracts["network-graph"].defaultInput,
    }),
  );
  assert.match(markup, /aria-label="network graph, conceptual motion graphic"/);
});
