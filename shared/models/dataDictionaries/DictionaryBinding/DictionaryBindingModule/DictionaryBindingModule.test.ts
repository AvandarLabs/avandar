import { describe, expect, it } from "vitest";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

describe("DictionaryBinding.toApplyErrorHint", () => {
  it("reads a hint the apply RPC sends", () => {
    expect(
      DictionaryBinding.toApplyErrorHint({ hint: "dataset_editor_required" }),
    ).toBe("dataset_editor_required");
  });

  it("ignores a hint it does not know", () => {
    expect(
      DictionaryBinding.toApplyErrorHint({ hint: "something_else" }),
    ).toBeUndefined();
  });
});
