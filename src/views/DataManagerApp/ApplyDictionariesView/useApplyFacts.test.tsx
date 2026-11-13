import { describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import {
  countPicks,
  useApplyFacts,
} from "@/views/DataManagerApp/ApplyDictionariesView/useApplyFacts";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const PICKS = {
  "col-gender": {
    dictionaryId: "nys",
    entryId: "sex",
    codeListId: "list",
    direction: "decode",
  },
  "col-case": {
    dictionaryId: "nys",
    entryId: "case",
    codeListId: undefined,
    direction: "decode",
  },
} as unknown as Record<string, ColumnPick>;

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
