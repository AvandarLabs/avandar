import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

type DatasetRef = { datasetId: Dataset.Id; datasetName: string };

const BRONX: DatasetRef = {
  datasetId: uuid<Dataset.Id>(),
  datasetName: "Bronx",
};
const KINGS: DatasetRef = {
  datasetId: uuid<Dataset.Id>(),
  datasetName: "Kings",
};
const ERIE: DatasetRef = { datasetId: uuid<Dataset.Id>(), datasetName: "Erie" };

function _coded(
  dataset: DatasetRef,
  columnName: string,
  codes: readonly string[],
): ColumnProfile.T {
  return {
    ...dataset,
    columnName,
    dataType: "varchar",
    rowCount: 300,
    nonNullCount: 300,
    distinctCount: codes.length,
    values: codes.map((value) => {
      return { value, rowCount: 100 };
    }),
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _firstEntry(proposal: DictionaryProposal.T): DictionaryProposal.Entry {
  const [entry] = proposal.entries;
  if (!entry) {
    throw new Error("The proposal has no entries.");
  }
  return entry;
}

function _names(proposal: DictionaryProposal.T): string[] {
  return proposal.entries.map((entry) => {
    return entry.name;
  });
}

const GENDER_AND_SEX = DictionaryProposal.fromColumnProfiles([
  _coded(BRONX, "GENDER", ["1", "2", "9"]),
  _coded(ERIE, "sex", ["M", "F", "U"]),
]);

const VACCINATION = DictionaryProposal.fromColumnProfiles([
  _coded(BRONX, "vax_status", ["Unvaccinated", "Partial", "Full"]),
  _coded(ERIE, "mmr_status", ["0", "1", "2"]),
]);

describe("DictionaryProposal edits", () => {
  it("splits the guessed columns back into their own entry on Keep apart", () => {
    const apart = DictionaryProposal.keepApart(
      GENDER_AND_SEX,
      _firstEntry(GENDER_AND_SEX).key,
    );
    expect(_names(apart)).toEqual(["gender", "sex"]);
    expect(apart.entries[0]?.suggestedColumns).toEqual([]);
    expect(apart.entries[0]?.suggestionReason).toBeUndefined();
  });

  it("joins one entry into another as a guess on a meaning match", () => {
    expect(_names(VACCINATION)).toEqual(["vax_status", "mmr_status"]);
    const matched = DictionaryProposal.applyMeaningMatches(VACCINATION, [
      { name: "mmr_status", sameAs: "vax_status" },
    ]);
    expect(_names(matched)).toEqual(["vax_status"]);
    expect(matched.entries[0]?.suggestionReason).toBe("meaning");
    expect(DictionaryProposal.getColumnNames(_firstEntry(matched))).toEqual([
      "vax_status",
      "mmr_status",
    ]);
  });

  it("ignores a meaning match between columns of one dataset", () => {
    const sameDataset = DictionaryProposal.fromColumnProfiles([
      _coded(BRONX, "vax_status", ["Unvaccinated", "Full"]),
      _coded(BRONX, "mmr_status", ["0", "1"]),
    ]);
    const matched = DictionaryProposal.applyMeaningMatches(sameDataset, [
      { name: "mmr_status", sameAs: "vax_status" },
    ]);
    expect(_names(matched)).toEqual(["vax_status", "mmr_status"]);
  });

  it("ignores a meaning match that names an entry the proposal lacks", () => {
    const matched = DictionaryProposal.applyMeaningMatches(VACCINATION, [
      { name: "dob", sameAs: "vax_status" },
    ]);
    expect(_names(matched)).toEqual(["vax_status", "mmr_status"]);
  });

  it("gives the columns kept apart a name no other entry has", () => {
    const renamed = DictionaryProposal.renameEntry(GENDER_AND_SEX, {
      entryKey: _firstEntry(GENDER_AND_SEX).key,
      name: "sex",
    });
    const apart = DictionaryProposal.keepApart(
      renamed,
      _firstEntry(renamed).key,
    );
    expect(_names(apart)).toEqual(["sex", "sex_2"]);
  });

  it("renames an entry as typed", () => {
    const renamed = DictionaryProposal.renameEntry(VACCINATION, {
      entryKey: _firstEntry(VACCINATION).key,
      name: "vaccination_status",
    });
    expect(_names(renamed)).toEqual(["vaccination_status", "mmr_status"]);
  });

  it("flags a blank name and names shared by included entries, ignoring case", () => {
    const [vax, mmr] = VACCINATION.entries;
    const blank = DictionaryProposal.renameEntry(VACCINATION, {
      entryKey: vax?.key ?? "",
      name: "  ",
    });
    expect([...DictionaryProposal.getEntryNameIssues(blank)]).toEqual([
      [vax?.key, "name_required"],
    ]);
    const shared = DictionaryProposal.renameEntry(VACCINATION, {
      entryKey: mmr?.key ?? "",
      name: " VAX_status ",
    });
    expect([...DictionaryProposal.getEntryNameIssues(shared)]).toEqual([
      [vax?.key, "name_not_unique"],
      [mmr?.key, "name_not_unique"],
    ]);
    const excluded = DictionaryProposal.setEntryIncluded(shared, {
      entryKey: mmr?.key ?? "",
      isIncluded: false,
    });
    expect(DictionaryProposal.getEntryNameIssues(excluded).size).toBe(0);
  });

  it("never lets a suggested description replace a typed one", () => {
    const entryKey = VACCINATION.entries[0]?.key ?? "";
    const typed = DictionaryProposal.setEntryDescription(VACCINATION, {
      entryKey,
      description: "MMR doses received",
    });
    const suggested = DictionaryProposal.suggestEntryDescription(typed, {
      entryKey,
      description: "Vaccination status",
    });
    expect(suggested.entries[0]?.description).toBe("MMR doses received");
    expect(suggested.entries[0]?.isDescriptionSuggested).toBe(false);
  });

  it("lists each column name once with the datasets it comes from", () => {
    const proposal = DictionaryProposal.fromColumnProfiles([
      _coded(BRONX, "GENDER", ["1", "2", "9"]),
      _coded(KINGS, "GENDER", ["1", "2", "9"]),
      _coded(ERIE, "sex", ["M", "F", "U"]),
    ]);
    expect(DictionaryProposal.getColumnSources(_firstEntry(proposal))).toEqual([
      { columnName: "GENDER", datasetNames: ["Bronx", "Kings"] },
      { columnName: "sex", datasetNames: ["Erie"] },
    ]);
    expect(DictionaryProposal.getDatasetIds(proposal)).toEqual([
      BRONX.datasetId,
      KINGS.datasetId,
      ERIE.datasetId,
    ]);
  });
});
