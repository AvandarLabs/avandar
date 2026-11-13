import { describe, expect, it } from "vitest";
import {
  GENDER,
  NYS,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import {
  applyDictionariesReducer,
  makeInitialApplyState,
  toValueKey,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { buildAddedPairs } from "@/views/DataManagerApp/ApplyDictionariesView/applyInputs/applyInputs";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

const CDC = "dict-cdc" as DataDictionary.Id;
const CASE_ID = "col-case" as DatasetColumn.Id;
const DESCRIPTION_PICK: ColumnPick = {
  ...SEX_PICK,
  entryId: "entry-case" as DataDictionaryEntry.Id,
  codeListId: undefined,
  mode: "reference",
};
const READY = applyDictionariesReducer(makeInitialApplyState(), {
  type: "matches_ready",
  dictionaryIds: [NYS],
  picks: { [GENDER.id]: SEX_PICK, [CASE_ID]: DESCRIPTION_PICK },
  selectedColumnId: GENDER.id,
  defaultMode: "convert",
  resolutions: {},
  saveTarget: "linked",
});

describe("applyDictionariesReducer", () => {
  it("ignores a second match result", () => {
    const state = applyDictionariesReducer(READY, {
      type: "matches_ready",
      dictionaryIds: [CDC],
      picks: {},
      selectedColumnId: undefined,
      defaultMode: "reference",
      resolutions: {},
      saveTarget: undefined,
    });

    expect(state).toBe(READY);
  });

  it("clears a pick when the picked match is chosen again", () => {
    const state = applyDictionariesReducer(READY, {
      type: "toggle_pick",
      columnId: GENDER.id,
      pick: SEX_PICK,
    });

    expect(state.picks[GENDER.id]).toBeUndefined();
  });

  it("starts a newly picked coded column in the default mode", () => {
    const other: ColumnPick = {
      ...SEX_PICK,
      entryId: "entry-gender" as DataDictionaryEntry.Id,
      mode: "reference",
    };
    const state = applyDictionariesReducer(READY, {
      type: "set_pick",
      columnId: GENDER.id,
      pick: other,
    });

    expect(state.picks[GENDER.id]?.mode).toBe("convert");
  });

  it("keeps a column's mode when its current pick is set again", () => {
    const asReference = applyDictionariesReducer(READY, {
      type: "set_mode",
      columnId: GENDER.id,
      mode: "reference",
    });
    const state = applyDictionariesReducer(asReference, {
      type: "set_pick",
      columnId: GENDER.id,
      pick: { ...SEX_PICK, mode: "convert" },
    });

    expect(state.picks[GENDER.id]?.mode).toBe("reference");
  });

  it("never converts a column whose entry has no code list", () => {
    const state = applyDictionariesReducer(READY, {
      type: "set_mode",
      columnId: CASE_ID,
      mode: "convert",
    });

    expect(state.picks[CASE_ID]?.mode).toBe("reference");
  });

  it("drops the kept original when a column goes back to reference", () => {
    const keeping = applyDictionariesReducer(READY, {
      type: "set_keeps_original",
      columnId: GENDER.id,
      keepsOriginal: true,
    });
    const state = applyDictionariesReducer(keeping, {
      type: "set_mode",
      columnId: GENDER.id,
      mode: "reference",
    });

    expect(state.picks[GENDER.id]).toMatchObject({
      mode: "reference",
      keepsOriginal: false,
    });
  });

  it("sets every coded column at once and makes it the default", () => {
    const state = applyDictionariesReducer(READY, {
      type: "set_all_modes",
      mode: "reference",
    });

    expect(state.picks[GENDER.id]?.mode).toBe("reference");
    expect(state.picks[CASE_ID]?.mode).toBe("reference");
    expect(state.defaultMode).toBe("reference");
  });

  it("marks a chosen direction and forgets that column's resolutions", () => {
    const resolved = applyDictionariesReducer(READY, {
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "7",
      resolution: { action: "empty" },
    });
    const state = applyDictionariesReducer(resolved, {
      type: "set_direction",
      columnId: GENDER.id,
      direction: "encode",
    });

    expect(state.picks[GENDER.id]).toMatchObject({
      direction: "encode",
      isDirectionFromData: false,
    });
    expect(state.resolutions[GENDER.id]).toBeUndefined();
  });

  it("stops adding a value to the list when its column changes mode", () => {
    const added = applyDictionariesReducer(READY, {
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "u",
      resolution: { action: "add", text: "Undisclosed" },
    });
    const asReference = applyDictionariesReducer(added, {
      type: "set_mode",
      columnId: GENDER.id,
      mode: "reference",
    });
    const allReference = applyDictionariesReducer(added, {
      type: "set_all_modes",
      mode: "reference",
    });

    [asReference, allReference].forEach((state) => {
      expect(
        buildAddedPairs({
          picks: state.picks,
          resolutions: state.resolutions,
          unmatchedByColumnId: new Map(),
        }),
      ).toEqual([]);
    });
  });

  it("keeps a column's resolutions when its mode does not change", () => {
    const added = applyDictionariesReducer(READY, {
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "u",
      resolution: { action: "add", text: "Undisclosed" },
    });
    const state = applyDictionariesReducer(added, {
      type: "set_mode",
      columnId: GENDER.id,
      mode: "convert",
    });

    expect(state.resolutions[GENDER.id]?.u).toEqual({
      action: "add",
      text: "Undisclosed",
    });
  });

  it("adds a value to the list from a reference column", () => {
    const asReference = applyDictionariesReducer(READY, {
      type: "set_mode",
      columnId: GENDER.id,
      mode: "reference",
    });
    const state = applyDictionariesReducer(asReference, {
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "u",
      resolution: { action: "add", text: "Undisclosed" },
    });

    expect(
      buildAddedPairs({
        picks: state.picks,
        resolutions: state.resolutions,
        unmatchedByColumnId: new Map(),
      }),
    ).toEqual([
      { codeListId: SEX_PICK.codeListId, code: "u", label: "Undisclosed" },
    ]);
  });

  it("records how a value is resolved, by its key", () => {
    const state = applyDictionariesReducer(READY, {
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: toValueKey(" M "),
      resolution: { action: "map", code: "1" },
    });

    expect(state.resolutions[GENDER.id]?.m).toEqual({
      action: "map",
      code: "1",
    });
  });

  it("forgets a column's resolutions when its entry changes", () => {
    const resolved = applyDictionariesReducer(READY, {
      type: "resolve_value",
      columnId: GENDER.id,
      valueKey: "7",
      resolution: { action: "empty" },
    });
    const state = applyDictionariesReducer(resolved, {
      type: "set_pick",
      columnId: GENDER.id,
      pick: { ...SEX_PICK, entryId: "entry-gender" as DataDictionaryEntry.Id },
    });

    expect(state.resolutions[GENDER.id]).toBeUndefined();
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
      picks: { [GENDER.id]: { ...SEX_PICK, dictionaryId: CDC } },
    });

    expect(state.dictionaryIds).toEqual([NYS, CDC]);
    expect(state.picks[GENDER.id]?.dictionaryId).toBe(NYS);
  });

  it("asks again for the workspace-change confirmation when the target changes", () => {
    const confirmed = applyDictionariesReducer(READY, {
      type: "set_workspace_change_confirmed",
      isConfirmed: true,
    });
    const state = applyDictionariesReducer(confirmed, {
      type: "set_save_target",
      saveTarget: "in_place",
    });

    expect(state.saveTarget).toBe("in_place");
    expect(state.hasConfirmedWorkspaceChange).toBe(false);
  });

  it("keeps the linked dataset's name as typed and opens the preview", () => {
    const named = applyDictionariesReducer(READY, {
      type: "set_linked_name",
      name: "Bronx (labeled)",
    });
    const state = applyDictionariesReducer(named, {
      type: "set_preview_open",
      isOpen: true,
    });

    expect(state.linkedDatasetName).toBe("Bronx (labeled)");
    expect(state.isPreviewOpen).toBe(true);
  });
});
