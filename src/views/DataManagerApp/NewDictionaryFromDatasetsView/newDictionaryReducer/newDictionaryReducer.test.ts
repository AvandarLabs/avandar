import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import {
  makeInitialNewDictionaryState,
  newDictionaryReducer,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  NewDictionaryState,
  ProposalReadId,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";

const DATASET_ID = uuid<Dataset.Id>();
const READ_ID = uuid<ProposalReadId>();

function _column(
  columnName: string,
  codes: readonly string[],
): ColumnProfile.T {
  return {
    datasetId: DATASET_ID,
    datasetName: "Kings line list",
    columnName,
    dataType: "varchar",
    rowCount: 200,
    nonNullCount: 200,
    distinctCount: codes.length,
    values: codes.map((value) => {
      return { value, rowCount: 50 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

const PROPOSAL = DictionaryProposal.fromColumnProfiles([
  _column("GENDER", ["1", "2", "9"]),
  _column("hosp_yn", ["Y", "N"]),
]);

function _read(state: NewDictionaryState): NewDictionaryState {
  const picked = state.pickedDatasetIds.includes(DATASET_ID)
    ? state
    : newDictionaryReducer(state, {
        type: "toggle_dataset",
        datasetId: DATASET_ID,
      });
  return newDictionaryReducer(picked, {
    type: "datasets_read",
    proposal: PROPOSAL,
    datasetIds: [DATASET_ID],
    readId: READ_ID,
    defaultName: "Kings line list codes",
  });
}

function _codeListKeys(): string[] {
  return DictionaryProposal.getCodings(PROPOSAL).codeLists.map((codeList) => {
    return codeList.key;
  });
}

describe("newDictionaryReducer", () => {
  it("starts at Pick, or at Review with the dataset picked when opened from it", () => {
    expect(makeInitialNewDictionaryState(undefined).step).toBe("pick");
    expect(makeInitialNewDictionaryState(DATASET_ID)).toMatchObject({
      step: "review",
      originDatasetId: DATASET_ID,
      pickedDatasetIds: [DATASET_ID],
    });
  });

  it("toggles a dataset in and out of the pick", () => {
    const picked = newDictionaryReducer(
      makeInitialNewDictionaryState(undefined),
      {
        type: "toggle_dataset",
        datasetId: DATASET_ID,
      },
    );
    expect(picked.pickedDatasetIds).toEqual([DATASET_ID]);
    const unpicked = newDictionaryReducer(picked, {
      type: "toggle_dataset",
      datasetId: DATASET_ID,
    });
    expect(unpicked.pickedDatasetIds).toEqual([]);
  });

  it("opens Review with the first code list selected once datasets are read", () => {
    const state = _read(makeInitialNewDictionaryState(undefined));
    expect(state.step).toBe("review");
    expect(state.selectedCodeListKey).toBe(_codeListKeys()[0]);
    expect(state.name).toBe("Kings line list codes");
    expect(Object.keys(state.labels)).toEqual(_codeListKeys());
  });

  it("keeps a typed name and typed labels when the datasets are read again", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const codeListKey = _codeListKeys()[0] ?? "";
    const typed = [
      { type: "set_name", name: "Borough codes" } as const,
      {
        type: "set_value_label",
        codeListKey,
        code: "1",
        label: "Male",
      } as const,
    ].reduce(newDictionaryReducer, read);
    const again = _read(typed);
    expect(again.name).toBe("Borough codes");
    expect(
      DictionaryProposal.getValueLabel(again.labels, { codeListKey, code: "1" })
        ?.label,
    ).toBe("Male");
  });

  it("accepts a list and selects the next, staying on the last one", () => {
    const [firstKey = "", secondKey = ""] = _codeListKeys();
    const read = _read(makeInitialNewDictionaryState(undefined));
    const accepted = newDictionaryReducer(read, {
      type: "accept_code_list",
      codeListKey: firstKey,
    });
    expect(accepted.selectedCodeListKey).toBe(secondKey);
    expect(accepted.labels[firstKey]?.isAccepted).toBe(true);
    const last = newDictionaryReducer(accepted, {
      type: "accept_code_list",
      codeListKey: secondKey,
    });
    expect(last.selectedCodeListKey).toBe(secondKey);
  });

  it("fills a single-entry list's entry with the suggested description", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const entryKey = PROPOSAL.entries[0]?.key;
    const suggested = newDictionaryReducer(read, {
      type: "labels_suggested",
      codeListKey: _codeListKeys()[0] ?? "",
      entryKey,
      suggestions: {
        labels: [{ value: "1", label: "Male", isMissing: false }],
        description: "Sex recorded at intake.",
      },
    });
    expect(suggested.proposal?.entries[0]).toMatchObject({
      description: "Sex recorded at intake.",
      isDescriptionSuggested: true,
    });
  });

  it("renames an entry and keeps the labels typed for its list", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const entryKey = PROPOSAL.entries[0]?.key ?? "";
    const codeListKey =
      DictionaryProposal.getCodings(PROPOSAL).codeLists.find((codeList) => {
        return codeList.entryKeys.includes(entryKey);
      })?.key ?? "";
    const renamed = [
      {
        type: "set_value_label",
        codeListKey,
        code: "1",
        label: "Male",
      } as const,
      { type: "rename_entry", entryKey, name: "sex_at_intake" } as const,
    ].reduce(newDictionaryReducer, read);
    expect(renamed.proposal?.entries[0]?.name).toBe("sex_at_intake");
    expect(
      DictionaryProposal.getValueLabel(renamed.labels, {
        codeListKey,
        code: "1",
      })?.label,
    ).toBe("Male");
  });

  it("remembers the answer to the first online suggestion", () => {
    const start = makeInitialNewDictionaryState(undefined);
    expect(start.suggestionConsent).toBe("not_asked");
    const approved = newDictionaryReducer(start, {
      type: "suggestion_consent_decided",
      isApproved: true,
    });
    expect(approved.suggestionConsent).toBe("approved");
    const declined = newDictionaryReducer(start, {
      type: "suggestion_consent_decided",
      isApproved: false,
    });
    expect(declined.suggestionConsent).toBe("declined");
  });

  it("goes back to Pick and forgets the origin on Learn from more datasets", () => {
    const state = newDictionaryReducer(
      _read(makeInitialNewDictionaryState(DATASET_ID)),
      { type: "learn_from_more" },
    );
    expect(state).toMatchObject({
      step: "pick",
      originDatasetId: undefined,
      pickedDatasetIds: [DATASET_ID],
    });
  });

  it("ignores a read of datasets that are no longer the ones picked", () => {
    const otherDatasetId = uuid<Dataset.Id>();
    const picking = [
      { type: "toggle_dataset", datasetId: DATASET_ID } as const,
      { type: "toggle_dataset", datasetId: otherDatasetId } as const,
    ].reduce(newDictionaryReducer, makeInitialNewDictionaryState(undefined));
    const state = newDictionaryReducer(picking, {
      type: "datasets_read",
      proposal: PROPOSAL,
      datasetIds: [DATASET_ID],
      readId: READ_ID,
      defaultName: "Kings line list codes",
    });
    expect(state).toBe(picking);
    expect(state.step).toBe("pick");
  });

  it("keeps the proposal of a newer read when an older read finishes late", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const otherDatasetId = uuid<Dataset.Id>();
    const repicked = newDictionaryReducer(read, {
      type: "toggle_dataset",
      datasetId: otherDatasetId,
    });
    const late = newDictionaryReducer(repicked, {
      type: "datasets_read",
      proposal: DictionaryProposal.fromColumnProfiles([]),
      datasetIds: [DATASET_ID],
      readId: uuid<ProposalReadId>(),
      defaultName: "Late",
    });
    expect(late).toBe(repicked);
  });

  it("applies meaning matches only to the read they were found for", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const matches = [{ name: "hosp_yn", sameAs: "GENDER" }];
    const stale = newDictionaryReducer(read, {
      type: "meaning_matches_found",
      matches,
      readId: uuid<ProposalReadId>(),
    });
    expect(stale).toBe(read);
    const current = newDictionaryReducer(read, {
      type: "meaning_matches_found",
      matches,
      readId: READ_ID,
    });
    expect(current).not.toBe(read);
  });

  it("drops late matches from an earlier read of the same datasets, so Keep apart stays", () => {
    const read = _read(makeInitialNewDictionaryState(undefined));
    const reread = newDictionaryReducer(read, {
      type: "datasets_read",
      proposal: PROPOSAL,
      datasetIds: [DATASET_ID],
      readId: uuid<ProposalReadId>(),
      defaultName: "Kings line list codes",
    });
    const late = newDictionaryReducer(reread, {
      type: "meaning_matches_found",
      matches: [{ name: "hosp_yn", sameAs: "GENDER" }],
      readId: READ_ID,
    });
    expect(late).toBe(reread);
  });

  it("keeps columns apart when matches from the same read arrive after Keep apart", () => {
    const otherDatasetId = uuid<Dataset.Id>();
    const proposal = DictionaryProposal.fromColumnProfiles([
      _column("GENDER", ["1", "2", "9"]),
      { ..._column("sex", ["M", "F", "U"]), datasetId: otherDatasetId },
    ]);
    const matches = [{ name: "sex", sameAs: "GENDER" }];
    const picked = [DATASET_ID, otherDatasetId].reduce((state, datasetId) => {
      return newDictionaryReducer(state, { type: "toggle_dataset", datasetId });
    }, makeInitialNewDictionaryState(undefined));
    const read = newDictionaryReducer(picked, {
      type: "datasets_read",
      proposal,
      datasetIds: [DATASET_ID, otherDatasetId],
      readId: READ_ID,
      defaultName: "codes",
    });
    const merged = newDictionaryReducer(read, {
      type: "meaning_matches_found",
      matches,
      readId: READ_ID,
    });
    expect(merged.proposal?.entries).toHaveLength(1);
    const apart = newDictionaryReducer(merged, {
      type: "keep_apart",
      entryKey: merged.proposal?.entries[0]?.key ?? "",
    });
    expect(apart.proposal?.entries).toHaveLength(2);
    const late = newDictionaryReducer(apart, {
      type: "meaning_matches_found",
      matches,
      readId: READ_ID,
    });
    expect(late.proposal?.entries).toHaveLength(2);
  });

  it("falls back to an empty Pick when the dataset that opened the flow is unavailable", () => {
    const state = newDictionaryReducer(
      makeInitialNewDictionaryState(DATASET_ID),
      { type: "origin_dataset_unavailable" },
    );
    expect(state).toMatchObject({
      step: "pick",
      originDatasetId: undefined,
      pickedDatasetIds: [],
    });
  });
});
