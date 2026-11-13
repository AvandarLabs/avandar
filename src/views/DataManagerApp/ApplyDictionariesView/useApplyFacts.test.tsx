import { describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import {
  countPicks,
  useApplyFacts,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const NYS = "nys" as DataDictionary.Id;
const PICKS: Record<string, ColumnPick> = {
  "col-gender": {
    dictionaryId: NYS,
    entryId: "sex" as DataDictionaryEntry.Id,
    codeListId: "list" as DataDictionaryCodeList.Id,
    direction: "decode",
  },
  "col-case": {
    dictionaryId: NYS,
    entryId: "case" as DataDictionaryEntry.Id,
    codeListId: undefined,
    direction: "decode",
  },
};

describe("useApplyFacts", () => {
  it("counts code lists, descriptions, columns, and dictionaries", () => {
    const { result } = renderHook(
      () => {
        return useApplyFacts({
          counts: countPicks(PICKS),
          columnCount: 22,
          dictionaryCount: 2,
        });
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toEqual([
      "1 attached as reference",
      "1 described",
      "of 22 columns",
      "from 1 of 2 dictionaries",
    ]);
  });
});
