import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import { makeDraftFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeDraftFromProposal/makeDraftFromProposal.ts";
import {
  setValueLabel,
  withDefaultLabels,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/proposalLabelHelpers/proposalLabelHelpers.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  codes: readonly string[],
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  return {
    datasetId,
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value, index) => {
      return { value, rowCount: 100 - index };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _entry(
  name: string,
  kind: DataDictionaryEntry.Kind,
  overrides: Partial<DictionaryProposalEntry> = {},
): DictionaryProposalEntry {
  return {
    key: `k:${name}`,
    name,
    columns: [_column(name, ["1", "2", "9"])],
    suggestedColumns: [],
    suggestionReason: undefined,
    kind,
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
    ...overrides,
  };
}

function _labelsFor(proposal: DictionaryProposalT) {
  return withDefaultLabels({}, getCodingsFromProposal(proposal).codeLists);
}

describe("makeDraftFromProposal", () => {
  it("keeps included entries, coded first, with their other column names", () => {
    const proposal: DictionaryProposalT = {
      entries: [
        _entry("case_id", "identifier"),
        _entry("GENDER", "categorical", {
          suggestedColumns: [_column("sex", ["M", "F", "U"], ERIE_ID)],
          suggestionReason: "other_codes",
        }),
        _entry("hosp_yn", "categorical", { isIncluded: false }),
      ],
    };
    const draft = makeDraftFromProposal({
      proposal,
      labels: _labelsFor(proposal),
    });
    expect(
      draft.entries.map((entry) => {
        return entry.name;
      }),
    ).toEqual(["GENDER", "case_id"]);
    const gender = draft.entries[0];
    expect(gender?.columnNames).toEqual(["sex"]);
    expect(
      gender?.codings.map((coding) => {
        return coding.isPrimary;
      }),
    ).toEqual([true, false]);
  });

  it("saves each value's label, and a blank label for a value without one", () => {
    const proposal: DictionaryProposalT = {
      entries: [_entry("GENDER", "categorical")],
    };
    const codeListKey =
      getCodingsFromProposal(proposal).codeLists[0]?.key ?? "";
    const labels = setValueLabel(_labelsFor(proposal), {
      codeListKey,
      code: "1",
      label: "Male",
    });
    const draft = makeDraftFromProposal({ proposal, labels });
    expect(
      draft.codeLists[0]?.pairs.map((pair) => {
        return [pair.code, pair.label];
      }),
    ).toEqual([
      ["1", "Male"],
      ["2", ""],
      ["9", ""],
    ]);
    expect(DataDictionary.findDraftWarnings(draft)).toHaveLength(2);
  });

  it("saves a shared list once, used by both entries", () => {
    const proposal: DictionaryProposalT = {
      entries: [
        _entry("symptom_fever", "categorical"),
        _entry("symptom_rash", "categorical"),
      ],
    };
    const draft = makeDraftFromProposal({
      proposal,
      labels: _labelsFor(proposal),
    });
    expect(draft.codeLists).toHaveLength(1);
    expect(draft.entries[0]?.codings[0]?.codeListId).toBe(
      draft.entries[1]?.codings[0]?.codeListId,
    );
  });

  it("builds a draft the dictionary saves as it is, unlabeled values included", () => {
    const proposal: DictionaryProposalT = {
      entries: [
        _entry("GENDER", "categorical"),
        _entry("ses_cat", "ordered", {
          columns: [_column("ses_cat", ["1", "2", "3"])],
        }),
        _entry("case_id", "identifier"),
      ],
    };
    const draft = makeDraftFromProposal({
      proposal,
      labels: _labelsFor(proposal),
    });
    expect(DataDictionary.findDraftIssues(draft)).toEqual([]);
  });
});
