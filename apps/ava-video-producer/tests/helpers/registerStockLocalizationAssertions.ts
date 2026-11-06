import assert from "node:assert/strict";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { makeLocalizedStockDataFromContract } from "../../src/stock/i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../src/stock/i18n/StockCopyMessages";
import type { StockContract } from "../../src/stock/contracts/StockContract.types";
/** A marked translated template and its expected decoded content span. */
type BoundTranslation = {
  path: ReadonlyArray<string | number>;
  template: string;
  text: string;
  start: number;
  end: number;
};

type Options<Input extends object> = {
  contract: StockContract<Input>;
  expectedTextPaths: ReadonlyArray<ReadonlyArray<string | number>>;
  suppliedInputs: readonly Input[];
  /**
   * Caller-owned marked translations and independently expected decoded output.
   */
  boundTranslations?: readonly BoundTranslation[];
};
/**
 * Check caller-owned prose paths, extracted strings, translations and input
 * isolation.
 */
export function registerStockLocalizationAssertions<Input extends object>({
  contract,
  expectedTextPaths,
  suppliedInputs,
  boundTranslations = [],
}: Readonly<Options<Input>>): void {
  test("every expected default prose path extracts and resolves without changing supplied input", () => {
    assert.deepEqual(contract.defaultTextPaths, expectedTextPaths);
    const messages = StockCopyMessages.getMessagesFromContract({
      [contract.id]: contract,
    });
    const boundByPath = new Map(
      boundTranslations.map((item) => [JSON.stringify(item.path), item]),
    );
    const translated = Object.fromEntries(
      expectedTextPaths.map((path, index) => [
        StockCopyMessages.getDefaultMessageIdFromPath({
          id: contract.id,
          path,
        }),
        boundByPath.get(JSON.stringify(path))?.template ?? `Traduit ${index}`,
      ]),
    );
    const i18n = setupI18n({ locale: "fr", messages: { fr: translated } });
    const original = structuredClone(contract.defaultInput);
    const suppliedOriginals = structuredClone(suppliedInputs);
    const resolved = makeLocalizedStockDataFromContract({ contract, i18n });
    assert.notEqual(resolved.defaultInput, contract.defaultInput);
    expectedTextPaths.forEach((path, index) => {
      const binding = contract.defaultSpanBindings?.find(
        (item) => JSON.stringify(item.textPath) === JSON.stringify(path),
      );
      const expected = boundByPath.get(JSON.stringify(path));
      assert.equal(
        messages[
          StockCopyMessages.getDefaultMessageIdFromPath({
            id: contract.id,
            path,
          })
        ],
        binding?.template ??
          StockCopyMessages.getValueFromPath({ value: original, path }),
      );
      if (binding) {
        assert.ok(
          expected,
          "Bound paths require caller-owned translated expectations.",
        );
        assert.equal(
          StockCopyMessages.getValueFromPath({
            value: resolved.defaultInput,
            path: binding.startPath,
          }),
          expected.start,
        );
        assert.equal(
          StockCopyMessages.getValueFromPath({
            value: resolved.defaultInput,
            path: binding.endPath,
          }),
          expected.end,
        );
      }
      assert.equal(
        StockCopyMessages.getValueFromPath({
          value: resolved.defaultInput,
          path,
        }),
        expected?.text ?? `Traduit ${index}`,
      );
    });
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
