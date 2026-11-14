import { describe, expect, it } from "vitest";
import { DictionaryBindingParsers } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";

const ROW = {
  applied_dictionary_version: 3,
  code_list_id: null,
  created_at: "2026-11-12T10:00:00+00:00",
  dataset_column_id: "11111111-1111-4111-8111-111111111111",
  dataset_id: "22222222-2222-4222-8222-222222222222",
  dictionary_id: "33333333-3333-4333-8333-333333333333",
  direction: "decode" as const,
  entry_id: "44444444-4444-4444-8444-444444444444",
  id: "55555555-5555-4555-8555-555555555555",
  keeps_original: false,
  mode: "reference" as const,
  pinned_is_ordered: null,
  pinned_pairs: null,
  replaced_data_type: null,
  updated_at: "2026-11-12T10:00:00+00:00",
  value_overrides: [],
  workspace_id: "66666666-6666-4666-8666-666666666666",
};

/** A column converted in place, with its pairs pinned and two overrides. */
const PINNED_ROW = {
  ...ROW,
  code_list_id: "77777777-7777-4777-8777-777777777777",
  keeps_original: true,
  mode: "convert" as const,
  pinned_is_ordered: false,
  pinned_pairs: [
    { code: "1", label: "Male", accepted_spellings: ["M"], is_missing: false },
  ],
  replaced_data_type: "bigint" as const,
  value_overrides: [
    { value: "7", action: "empty" },
    { value: "m", action: "map", code: "1" },
  ],
};

describe("DictionaryBindingParsers", () => {
  it("reads a description-only binding with no code list", () => {
    const binding = DictionaryBindingParsers.fromDBReadToModelRead(ROW);

    expect(binding.codeListId).toBeUndefined();
    expect(binding.entryId).toBe(ROW.entry_id);
    expect(binding.mode).toBe("reference");
    expect(binding.pinnedPairs).toBeUndefined();
    expect(binding.valueOverrides).toEqual([]);
    expect(binding.replacedDataType).toBeUndefined();
  });

  it("reads a pinned conversion's pairs, overrides, and replaced type", () => {
    const binding = DictionaryBindingParsers.fromDBReadToModelRead(PINNED_ROW);

    expect(binding.pinnedPairs).toEqual([
      { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
    ]);
    expect(binding.pinnedIsOrdered).toBe(false);
    expect(binding.keepsOriginal).toBe(true);
    expect(binding.valueOverrides).toEqual([
      { value: "7", action: "empty" },
      { value: "m", action: "map", code: "1" },
    ]);
    expect(binding.replacedDataType).toBe("bigint");
  });

  it("refuses a mode the schema does not know", () => {
    expect(() => {
      return DictionaryBindingParsers.fromDBReadToModelRead({
        ...ROW,
        mode: "translate" as "reference",
      });
    }).toThrow();
  });

  it("refuses an override that maps to no code", () => {
    expect(() => {
      return DictionaryBindingParsers.fromDBReadToModelRead({
        ...PINNED_ROW,
        value_overrides: [{ value: "m", action: "map" }],
      });
    }).toThrow();
  });

  it("writes pinned pairs in the stored shape", () => {
    const binding = DictionaryBindingParsers.fromDBReadToModelRead(PINNED_ROW);

    const dbRow = DictionaryBindingParsers.fromModelUpdateToDBUpdate({
      pinnedPairs: binding.pinnedPairs,
      valueOverrides: binding.valueOverrides,
    });

    expect(dbRow.pinned_pairs).toEqual(PINNED_ROW.pinned_pairs);
    expect(dbRow.value_overrides).toEqual(PINNED_ROW.value_overrides);
  });
});
