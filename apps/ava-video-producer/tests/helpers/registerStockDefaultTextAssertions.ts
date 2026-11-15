import assert from "node:assert/strict";
import test from "node:test";
import { getStockValueFromPath } from "../../src/stock/copy/getStockValueFromPath/getStockValueFromPath";
import { makeStockDataFromContract } from "../../src/stock/copy/makeStockDataFromContract";
import type { StockContract } from "../../src/stock/contracts/StockContract.types";

type Options<Input extends object> = {
  contract: StockContract<Input>;
  expectedTextPaths: ReadonlyArray<ReadonlyArray<string | number>>;
  suppliedInputs: readonly Input[];
};

/**
 * Check caller-owned prose paths, the resolved English defaults, and input
 * isolation.
 */
export function registerStockDefaultTextAssertions<Input extends object>({
  contract,
  expectedTextPaths,
  suppliedInputs,
}: Readonly<Options<Input>>): void {
  test("every expected default prose path resolves to its default text without changing supplied input", () => {
    assert.deepEqual(contract.defaultTextPaths, expectedTextPaths);
    const original = structuredClone(contract.defaultInput);
    const suppliedOriginals = structuredClone(suppliedInputs);
    const resolved = makeStockDataFromContract({ contract });
    assert.notEqual(resolved.defaultInput, contract.defaultInput);
    expectedTextPaths.forEach((path) => {
      const text = getStockValueFromPath({ value: original, path });
      assert.equal(typeof text, "string", path.join("."));
      assert.equal(
        getStockValueFromPath({ value: resolved.defaultInput, path }),
        text,
      );
    });
    assert.deepEqual(resolved.defaultInput, original);
    assert.deepEqual(contract.defaultInput, original);
    suppliedInputs.forEach((input, index) =>
      assert.deepEqual(
        contract.inputSchema.parse(input),
        suppliedOriginals[index],
      ),
    );
    assert.deepEqual(suppliedInputs, suppliedOriginals);
  });
}
