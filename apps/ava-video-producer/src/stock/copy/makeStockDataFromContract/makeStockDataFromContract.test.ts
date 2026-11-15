import assert from "node:assert/strict";
import test from "node:test";
import { stockContracts } from "../../registry/stockContracts";
import { getStockValueFromPath } from "../getStockValueFromPath";
import { makeStockDataFromContract } from "./makeStockDataFromContract";

test("every default prose path holds text and resolves into an independent copy of the default", () => {
  Object.values(stockContracts).forEach((contract) => {
    const resolved = makeStockDataFromContract({ contract });
    assert.notEqual(resolved.defaultInput, contract.defaultInput, contract.id);
    assert.deepEqual(resolved.defaultInput, contract.defaultInput, contract.id);
    contract.defaultTextPaths.forEach((path) =>
      assert.equal(
        typeof getStockValueFromPath({ value: contract.defaultInput, path }),
        "string",
        `${contract.id}.${path.join(".")}`,
      ),
    );
  });
});

test("metadata and controls resolve each descriptor to its English message", () => {
  const contract = stockContracts["metric-counter"];
  const { metadata, controls } = makeStockDataFromContract({ contract });
  assert.equal(metadata.name, contract.metadata.name.message);
  assert.equal(controls[0]?.label, contract.controls[0]?.label.message);
});
