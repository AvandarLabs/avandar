import { describe, expect, it } from "vitest";
import {
  applyDictionariesReducer,
  makeInitialApplyState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const NYS = "dict-nys" as DataDictionary.Id;
const CDC = "dict-cdc" as DataDictionary.Id;
const GENDER = "col-gender" as DatasetColumn.Id;
const SEX_PICK: ColumnPick = {
  dictionaryId: NYS,
  entryId: "entry-sex" as DataDictionaryEntry.Id,
  codeListId: undefined,
  direction: "decode",
};
const READY = applyDictionariesReducer(makeInitialApplyState(), {
  type: "matches_ready",
  dictionaryIds: [NYS],
  picks: { [GENDER]: SEX_PICK },
  selectedColumnId: GENDER,
});

describe("applyDictionariesReducer", () => {
  it("ignores a second match result", () => {
    const state = applyDictionariesReducer(READY, {
      type: "matches_ready",
      dictionaryIds: [CDC],
      picks: {},
      selectedColumnId: undefined,
    });

    expect(state).toBe(READY);
  });

  it("clears a pick when the picked match is chosen again", () => {
    const state = applyDictionariesReducer(READY, {
      type: "toggle_pick",
      columnId: GENDER,
      pick: SEX_PICK,
    });

    expect(state.picks[GENDER]).toBeUndefined();
  });

  it("drops every pick from a dictionary that stops being used", () => {
    const state = applyDictionariesReducer(READY, {
      type: "remove_dictionary",
      dictionaryId: NYS,
    });

    expect(state.dictionaryIds).toEqual([]);
    expect(state.picks).toEqual({});
  });

  it("keeps the user's picks when a dictionary is added", () => {
    const state = applyDictionariesReducer(READY, {
      type: "add_dictionary",
      dictionaryId: CDC,
      picks: { [GENDER]: { ...SEX_PICK, dictionaryId: CDC } },
    });

    expect(state.dictionaryIds).toEqual([NYS, CDC]);
    expect(state.picks[GENDER]?.dictionaryId).toBe(NYS);
  });
});
