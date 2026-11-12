import { describe, expect, it } from "vitest";
import {
  codePairsToDBJson,
  DataDictionaryCodeListParsers,
} from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";

const DB_ROW = {
  created_at: "2026-11-11T10:00:00+00:00",
  dictionary_id: "4c8c5f38-0f4e-4d3b-9a32-0d1c51f8b001",
  id: "4c8c5f38-0f4e-4d3b-9a32-0d1c51f8b002",
  is_ordered: false,
  name: "Sex (1/2/9)",
  pairs: [
    { code: "1", label: "Male", accepted_spellings: ["M"], is_missing: false },
    { code: "9", label: "Unknown", accepted_spellings: [], is_missing: true },
  ],
  updated_at: "2026-11-11T10:00:00+00:00",
  workspace_id: "4c8c5f38-0f4e-4d3b-9a32-0d1c51f8b003",
};

describe("DataDictionaryCodeListParsers", () => {
  it("reads stored pairs into camel-cased pairs in order", () => {
    const codeList =
      DataDictionaryCodeListParsers.fromDBReadToModelRead(DB_ROW);

    expect(codeList.pairs).toEqual([
      { code: "1", label: "Male", acceptedSpellings: ["M"], isMissing: false },
      { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
    ]);
    expect(codeList.dictionaryId).toBe(DB_ROW.dictionary_id);
  });

  it("refuses stored pairs missing a field", () => {
    expect(() => {
      return DataDictionaryCodeListParsers.fromDBReadToModelRead({
        ...DB_ROW,
        pairs: [{ code: "1", label: "Male" }],
      });
    }).toThrow();
  });

  it("writes pairs back in the stored shape", () => {
    expect(
      codePairsToDBJson([
        {
          code: "2",
          label: "Female",
          acceptedSpellings: ["F"],
          isMissing: false,
        },
      ]),
    ).toEqual([
      {
        code: "2",
        label: "Female",
        accepted_spellings: ["F"],
        is_missing: false,
      },
    ]);
  });
});
