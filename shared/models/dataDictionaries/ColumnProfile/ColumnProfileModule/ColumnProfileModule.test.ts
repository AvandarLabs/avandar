import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _profile(overrides: Partial<ColumnProfile.T> = {}): ColumnProfile.T {
  return {
    datasetId: BRONX_ID,
    datasetName: "Bronx line list",
    columnName: "GENDER",
    dataType: "bigint",
    rowCount: 500,
    nonNullCount: 500,
    distinctCount: 3,
    values: [
      { value: "1", rowCount: 260 },
      { value: "2", rowCount: 230 },
      { value: "9", rowCount: 10 },
    ],
    dateShare: undefined,
    numberRange: { min: 1, max: 9 },
    ...overrides,
  };
}

describe("ColumnProfile.getTokensFromColumnName", () => {
  it.each([
    ["onset_dt", ["onset", "date"]],
    ["hosp_yn", ["hospitalized", "yes", "no"]],
    ["CaseNo", ["case", "no"]],
    ["ZIPCode", ["zip"]],
    ["postal_code", ["zip"]],
    ["GENDER", ["sex"]],
    ["dob", ["birth", "date"]],
  ])("reads %s as %j", (columnName, tokens) => {
    expect(ColumnProfile.getTokensFromColumnName(columnName)).toEqual(tokens);
  });
});

describe("ColumnProfile.getEntryNameFromColumnName", () => {
  it.each([
    ["GENDER", "gender"],
    ["CaseNo", "case_no"],
    ["Onset Date", "onset_date"],
    ["ZIPCode", "zip_code"],
    ["hosp_yn", "hosp_yn"],
  ])("names an entry for %s %s", (columnName, entryName) => {
    expect(ColumnProfile.getEntryNameFromColumnName(columnName)).toBe(
      entryName,
    );
  });
});

describe("ColumnProfile.getEntryKind", () => {
  it("calls a column whose values are nearly all different an identifier", () => {
    const profile = _profile({
      columnName: "case_id",
      dataType: "varchar",
      distinctCount: 500,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("identifier");
  });

  it("calls a unique-per-row timestamp a date, not an identifier", () => {
    const profile = _profile({
      columnName: "reported_at",
      dataType: "timestamp",
      distinctCount: 500,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("date");
  });

  it("calls a mostly unique column named like a number an identifier", () => {
    const profile = _profile({
      columnName: "CaseNo",
      distinctCount: 450,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("identifier");
  });

  it("keeps a coded column categorical in a dataset of three rows", () => {
    const profile = _profile({ rowCount: 3, nonNullCount: 3 });
    expect(ColumnProfile.getEntryKind(profile)).toBe("categorical");
  });

  it("calls a text column whose values parse as dates a date", () => {
    const profile = _profile({
      columnName: "onset",
      dataType: "varchar",
      distinctCount: 120,
      values: undefined,
      dateShare: 0.96,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("date");
  });

  it("calls consecutive integer codes in a scale-named column ordered", () => {
    const profile = _profile({
      columnName: "ses_cat",
      distinctCount: 4,
      values: ["1", "2", "3", "4"].map((value) => {
        return { value, rowCount: 100 };
      }),
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("ordered");
  });

  it("calls words from a known scale ordered, ignoring a missing value", () => {
    const profile = _profile({
      columnName: "severity",
      dataType: "varchar",
      distinctCount: 4,
      values: ["Mild", "Moderate", "Severe", "Unknown"].map((value) => {
        return { value, rowCount: 100 };
      }),
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("ordered");
  });

  it("calls a short coded column categorical", () => {
    expect(ColumnProfile.getEntryKind(_profile())).toBe("categorical");
  });

  it("calls a many-valued number column a number", () => {
    const profile = _profile({
      columnName: "age_mo",
      distinctCount: 90,
      values: undefined,
      numberRange: { min: 0, max: 94 },
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("number");
  });

  it("calls a many-valued text column text", () => {
    const profile = _profile({
      columnName: "notes",
      dataType: "varchar",
      distinctCount: 300,
      values: undefined,
    });
    expect(ColumnProfile.getEntryKind(profile)).toBe("text");
  });
});

describe("ColumnProfile.getMatchScore", () => {
  it("scores the same column in two datasets as a match", () => {
    const match = ColumnProfile.getMatchScore(
      _profile(),
      _profile({ datasetId: ERIE_ID }),
    );
    expect(match.score).toBe(1);
    expect(match.band).toBe("match");
  });

  it("matches zip_code and ZIP by name when neither lists its values", () => {
    const zipCode = _profile({
      columnName: "zip_code",
      dataType: "varchar",
      values: undefined,
      numberRange: undefined,
    });
    const zip = { ...zipCode, datasetId: ERIE_ID, columnName: "ZIP" };
    expect(ColumnProfile.getMatchScore(zipCode, zip).band).toBe("match");
  });

  it("gives GENDER and sex a full name score but no value score", () => {
    const sex = _profile({
      datasetId: ERIE_ID,
      columnName: "sex",
      dataType: "varchar",
      values: ["M", "F", "U"].map((value) => {
        return { value, rowCount: 120 };
      }),
      numberRange: undefined,
    });
    const match = ColumnProfile.getMatchScore(_profile(), sex);
    expect(match.nameScore).toBe(1);
    expect(match.valueScore).toBe(0);
    expect(match.band).toBe("none");
  });

  it("only suggests two columns that share values and half their name", () => {
    const match = ColumnProfile.getMatchScore(
      _profile({ columnName: "symptom_fever" }),
      _profile({ datasetId: ERIE_ID, columnName: "symptom_rash" }),
    );
    expect(match.nameScore).toBe(0.5);
    expect(match.band).toBe("suggestion");
  });

  it("treats two long words a letter apart as the same word", () => {
    const match = ColumnProfile.getMatchScore(
      _profile({ columnName: "hospitalised" }),
      _profile({ datasetId: ERIE_ID, columnName: "hospitalized" }),
    );
    expect(match.nameScore).toBe(1);
  });

  it("never treats short words a letter apart as the same word", () => {
    const match = ColumnProfile.getMatchScore(
      _profile({ columnName: "ses" }),
      _profile({ datasetId: ERIE_ID, columnName: "sex" }),
    );
    expect(match.nameScore).toBe(0);
  });
});

describe("ColumnProfile.sortValuesInScaleOrder", () => {
  it("puts known scale words in scale order and missing values last", () => {
    const sorted = ColumnProfile.sortValuesInScaleOrder(
      ["High", "Unknown", "Low", "Medium"].map((value) => {
        return { value, rowCount: 10 };
      }),
    );
    expect(
      sorted.map((item) => {
        return item.value;
      }),
    ).toEqual(["Low", "Medium", "High", "Unknown"]);
  });

  it("puts integer codes in numeric order", () => {
    const sorted = ColumnProfile.sortValuesInScaleOrder(
      ["10", "2", "1"].map((value) => {
        return { value, rowCount: 10 };
      }),
    );
    expect(
      sorted.map((item) => {
        return item.value;
      }),
    ).toEqual(["1", "2", "10"]);
  });
});
