import { describe, expect, it } from "vitest";
import { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

describe("DictionaryBinding.toApplyErrorHint", () => {
  it("reads a hint the apply RPC sends", () => {
    expect(
      DictionaryBinding.toApplyErrorHint({ hint: "dataset_editor_required" }),
    ).toBe("dataset_editor_required");
  });

  it.each([
    "convert_needs_code_list",
    "dataset_has_linked_datasets",
    "dictionary_editor_required",
    "code_pair_incomplete",
    "codes_not_unique",
    "labels_not_unique",
    "dataset_creator_required",
    "nothing_to_reapply",
  ] as const)("reads the conversion hint %s", (hint) => {
    expect(DictionaryBinding.toApplyErrorHint({ hint })).toBe(hint);
  });

  it("ignores a hint it does not know", () => {
    expect(
      DictionaryBinding.toApplyErrorHint({ hint: "something_else" }),
    ).toBeUndefined();
  });
});
