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
  mode: "reference" as const,
  updated_at: "2026-11-12T10:00:00+00:00",
  workspace_id: "66666666-6666-4666-8666-666666666666",
};

describe("DictionaryBindingParsers", () => {
  it("reads a description-only binding with no code list", () => {
    const binding = DictionaryBindingParsers.fromDBReadToModelRead(ROW);

    expect(binding.codeListId).toBeUndefined();
    expect(binding.entryId).toBe(ROW.entry_id);
    expect(binding.mode).toBe("reference");
  });

  it("refuses a mode the schema does not know", () => {
    expect(() => {
      return DictionaryBindingParsers.fromDBReadToModelRead({
        ...ROW,
        mode: "translate" as "reference",
      });
    }).toThrow();
  });
});
