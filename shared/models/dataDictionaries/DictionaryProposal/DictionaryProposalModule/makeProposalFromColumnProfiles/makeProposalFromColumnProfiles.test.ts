import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { makeProposalFromColumnProfiles } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.ts";
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
  overrides: Partial<ColumnProfile.T> = {},
): ColumnProfile.T {
  return {
    ...dataset,
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
    ...overrides,
  };
}

const SEX_CODES = ["1", "2", "9"];

describe("makeProposalFromColumnProfiles", () => {
  it("gives each column of one dataset its own entry", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(BRONX, "hosp_yn", ["Y", "N"]),
    ]);
    expect(
      proposal.entries.map((entry) => {
        return [entry.key, entry.name];
      }),
    ).toEqual([
      [`${BRONX.datasetId}:GENDER`, "gender"],
      [`${BRONX.datasetId}:hosp_yn`, "hosp_yn"],
    ]);
  });

  it("puts a column with the same name in two datasets in one entry", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(KINGS, "GENDER", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.columns).toHaveLength(2);
    expect(proposal.entries[0]?.suggestedColumns).toEqual([]);
  });

  it("joins GENDER and sex with other codes as a guess to review", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(ERIE, "sex", ["M", "F", "U"]),
    ]);
    const [entry] = proposal.entries;
    expect(proposal.entries).toHaveLength(1);
    expect(entry?.suggestionReason).toBe("other_codes");
    expect(
      entry?.suggestedColumns.map((column) => {
        return column.columnName;
      }),
    ).toEqual(["sex"]);
  });

  it("joins zip_code and ZIP, whose values are not listed", () => {
    const longColumn = { values: undefined, distinctCount: 180 };
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "zip_code", [], longColumn),
      _coded(ERIE, "ZIP", [], longColumn),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.columns).toHaveLength(2);
  });

  it("joins columns with similar names and the same values as a guess", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "symptom_fever", SEX_CODES),
      _coded(ERIE, "symptom_rash", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.suggestionReason).toBe("similar_name");
  });

  it("never joins two columns of one dataset", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "symptom_fever", SEX_CODES),
      _coded(BRONX, "symptom_rash", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(2);
  });

  it("names an entry after its most common column name, in lowercase words", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(ERIE, "GENDER", SEX_CODES),
      _coded(BRONX, "sex", SEX_CODES),
      _coded(KINGS, "Sex", SEX_CODES),
    ]);
    expect(proposal.entries[0]?.name).toBe("sex");
  });

  it("splits camelCase into words joined by underscores", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "CaseNo", [], { values: undefined, distinctCount: 300 }),
    ]);
    expect(proposal.entries[0]?.name).toBe("case_no");
  });

  it("gives two entries that would share a name different names", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "Gender", SEX_CODES),
      _coded(BRONX, "gender", ["M", "F"]),
    ]);
    expect(
      proposal.entries.map((entry) => {
        return entry.name;
      }),
    ).toEqual(["gender", "gender_2"]);
  });

  it("avoids names that are already taken", () => {
    const proposal = makeProposalFromColumnProfiles(
      [_coded(ERIE, "sex", ["M", "F", "U"])],
      { takenNames: ["Sex"] },
    );
    expect(proposal.entries[0]?.name).toBe("sex_2");
  });

  it("gives an entry the kind its columns look like", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "ses_cat", ["1", "2", "3", "4"]),
    ]);
    expect(proposal.entries[0]?.kind).toBe("ordered");
  });
});
