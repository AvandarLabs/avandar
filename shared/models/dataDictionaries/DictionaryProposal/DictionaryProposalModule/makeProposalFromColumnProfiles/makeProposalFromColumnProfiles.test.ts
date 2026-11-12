import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { makeProposalFromColumnProfiles } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/makeProposalFromColumnProfiles/makeProposalFromColumnProfiles.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DictionaryProposalEntry } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
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

function _getPermutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) {
    return [[...items]];
  }
  return items.flatMap((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    return _getPermutations(rest).map((permutation) => {
      return [item, ...permutation];
    });
  });
}

/** Each entry's columns and guesses as sorted `dataset.column` labels. */
function _describeGrouping(profiles: readonly ColumnProfile.T[]): string[] {
  const label = (column: ColumnProfile.T): string => {
    return `${column.datasetName}.${column.columnName}`;
  };
  return makeProposalFromColumnProfiles(profiles)
    .entries.map((entry) => {
      const columns = entry.columns.map(label).sort().join(",");
      const guesses = entry.suggestedColumns.map(label).sort().join(",");
      return `${columns} | ${guesses}`;
    })
    .sort();
}

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

  it("names the entry after the column read first when two names tie", () => {
    const names = (profiles: ColumnProfile.T[]): string | undefined => {
      return makeProposalFromColumnProfiles(profiles).entries[0]?.name;
    };
    expect(
      names([
        _coded(BRONX, "GENDER", SEX_CODES),
        _coded(ERIE, "sex", SEX_CODES),
      ]),
    ).toBe("gender");
    expect(
      names([
        _coded(ERIE, "sex", SEX_CODES),
        _coded(BRONX, "GENDER", SEX_CODES),
      ]),
    ).toBe("sex");
  });

  it("lets a certain match take a name a guess would have blocked", () => {
    const yesNo = ["Y", "N"];
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "symptom_fever", yesNo),
      _coded(KINGS, "symptom_rash", yesNo),
      _coded(KINGS, "symptom_fever", yesNo),
    ]);
    const describeEntry = (entry: DictionaryProposalEntry): string[] => {
      return [
        entry.name,
        ...entry.columns.map((column) => {
          return `${column.datasetName}.${column.columnName}`;
        }),
      ];
    };
    expect(proposal.entries.map(describeEntry)).toEqual([
      ["symptom_fever", "Bronx.symptom_fever", "Kings.symptom_fever"],
      ["symptom_rash", "Kings.symptom_rash"],
    ]);
  });

  it("keeps the strongest reason when several guesses join one entry", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "GENDER", SEX_CODES),
      _coded(ERIE, "sex", ["M", "F", "U"]),
      _coded(KINGS, "gender_group", SEX_CODES),
    ]);
    expect(proposal.entries).toHaveLength(1);
    expect(proposal.entries[0]?.suggestionReason).toBe("other_codes");
  });

  it("matches zero-padded codes with the same codes without padding", () => {
    const proposal = makeProposalFromColumnProfiles([
      _coded(BRONX, "grade_cat", ["1", "2", "3"]),
      _coded(ERIE, "grade_cat", ["01", "02", "03"]),
    ]);
    expect(proposal.entries[0]?.suggestionReason).toBeUndefined();
    expect(proposal.entries[0]?.columns).toHaveLength(2);
  });

  it.each([
    [["Kings.symptom_rash", "Bronx.symptom_fever", "Kings.symptom_fever"]],
    [["Bronx.symptom_rash", "Kings.symptom_fever", "Erie.symptom_fever"]],
    [
      [
        "Bronx.symptom_rash",
        "Kings.symptom_fever",
        "Erie.symptom_fever",
        "Erie.symptom_rash",
      ],
    ],
    [
      [
        "Bronx.symptom_fever",
        "Kings.symptom_rash",
        "Erie.symptom_rash",
        "Erie.symptom_fever",
      ],
    ],
  ])("groups %j the same way in every input order", (labels) => {
    const datasets = new Map(
      [BRONX, KINGS, ERIE].map((dataset) => {
        return [dataset.datasetName, dataset];
      }),
    );
    const profiles = labels.map((label) => {
      const [datasetName = "", columnName = ""] = label.split(".");
      return _coded(datasets.get(datasetName) ?? BRONX, columnName, ["Y", "N"]);
    });
    const groupings = new Set(
      _getPermutations(profiles).map((permutation) => {
        return _describeGrouping(permutation).join("  ");
      }),
    );
    expect([...groupings]).toEqual([_describeGrouping(profiles).join("  ")]);
  });

  it("puts both symptom_fever columns in one entry, whatever is read first", () => {
    expect(
      _describeGrouping([
        _coded(BRONX, "symptom_rash", ["Y", "N"]),
        _coded(KINGS, "symptom_fever", ["Y", "N"]),
        _coded(ERIE, "symptom_fever", ["Y", "N"]),
      ]),
    ).toEqual(["Erie.symptom_fever,Kings.symptom_fever | Bronx.symptom_rash"]);
  });

  it("clusters thousands of columns in well under five seconds", () => {
    const words = ["case", "onset", "rash", "fever", "sex", "age", "county"];
    const datasets = Array.from({ length: 100 }, (_item, index) => {
      return { datasetId: uuid<Dataset.Id>(), datasetName: `D${index}` };
    });
    const profiles = Array.from({ length: 6000 }, (_item, index) => {
      const datasetNumber = Math.floor(index / 60);
      const columnNumber = index % 60;
      const columnName = `${words[(columnNumber * 7 + datasetNumber) % 7]}_${words[columnNumber % 7]}_${columnNumber}`;
      return _coded(datasets[datasetNumber] ?? BRONX, columnName, [
        "Y",
        "N",
        String(columnNumber % 5),
      ]);
    });
    const startedAt = performance.now();
    makeProposalFromColumnProfiles(profiles);
    expect(performance.now() - startedAt).toBeLessThan(5000);
  });
});
