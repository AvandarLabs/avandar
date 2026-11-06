import assert from "node:assert/strict";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { parseStockInput } from "../../contracts/parseStockInput/parseStockInput";
import { stockContracts } from "../../registry/stockContracts";
import { makeLocalizedStockDataFromContract } from "../makeLocalizedStockDataFromContract";
import { stockI18n } from "./stockI18n";

test("English omission resolves a cloned complete canonical default", () => {
  const contract = stockContracts["decision-fork"];
  const resolved = makeLocalizedStockDataFromContract({
    contract,
    i18n: stockI18n,
  });
  assert.deepEqual(resolved.defaultInput, contract.defaultInput);
  assert.notEqual(resolved.defaultInput, contract.defaultInput);
  assert.equal(resolved.metadata.name, contract.metadata.name.message);
});
test("only visible default paths translate and supplied labels bypass translation", () => {
  const contract = stockContracts["decision-fork"];
  const i18n = setupI18n({
    locale: "es",
    messages: {
      es: {
        "motionAtlas.decision-fork.default.prompt": "Pregunta traducida",
        "motionAtlas.decision-fork.name": "Elegir",
      },
    },
  });
  const resolved = makeLocalizedStockDataFromContract({ contract, i18n });
  assert.equal(resolved.defaultInput.prompt, "Pregunta traducida");
  assert.equal(
    resolved.defaultInput.selectedBranchId,
    contract.defaultInput.selectedBranchId,
  );
  assert.equal(resolved.metadata.name, "Elegir");
  const authored = {
    ...contract.defaultInput,
    prompt: "<content>Author</content> supplied",
  };
  assert.equal(
    parseStockInput({ preset: "decision-fork", rawInput: authored }).prompt,
    "<content>Author</content> supplied",
  );
});
test("stale English entries cannot replace newly authored canonical default text", () => {
  const original = stockContracts["decision-fork"];
  const contract = {
    ...original,
    defaultInput: {
      ...original.defaultInput,
      prompt: "Fresh canonical wording",
    },
  };
  assert.equal(
    makeLocalizedStockDataFromContract({ contract, i18n: stockI18n })
      .defaultInput.prompt,
    "Fresh canonical wording",
  );
});
test("every canonical English default remains literal schema-valid content", () => {
  Object.values(stockContracts).forEach((contract) => {
    const resolved = makeLocalizedStockDataFromContract({
      contract,
      i18n: stockI18n,
    });
    assert.deepEqual(resolved.defaultInput, contract.defaultInput, contract.id);
    assert.equal(
      contract.inputSchema.safeParse(resolved.defaultInput).success,
      true,
      contract.id,
    );
  });
});
