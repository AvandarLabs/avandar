import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { getCodingsFromProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposalModule/getCodingsFromProposal/getCodingsFromProposal.ts";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DictionaryProposalEntry } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const BRONX_ID = uuid<Dataset.Id>();
const ERIE_ID = uuid<Dataset.Id>();

function _column(
  columnName: string,
  counts: Readonly<Record<string, number>>,
  datasetId: Dataset.Id = BRONX_ID,
): ColumnProfile.T {
  const values = Object.entries(counts).map(([value, rowCount]) => {
    return { value, rowCount };
  });
  return {
    datasetId,
    datasetName: "Bronx",
    columnName,
    dataType: "varchar",
    rowCount: 500,
    nonNullCount: 500,
    distinctCount: values.length,
    values,
    dateShare: undefined,
    numberRange: undefined,
  };
}

function _entry(
  name: string,
  kind: DataDictionaryEntry.Kind,
  columns: ColumnProfile.T[],
  overrides: Partial<DictionaryProposalEntry> = {},
): DictionaryProposalEntry {
  return {
    key: `k:${name}`,
    name,
    columns,
    suggestedColumns: [],
    suggestionReason: undefined,
    kind,
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
    ...overrides,
  };
}

const SEX_COUNTS = { "1": 260, "2": 230, "9": 10 };
const YES_NO_UNKNOWN = { "1": 50, "2": 40, "9": 5 };

describe("getCodingsFromProposal", () => {
  it("names a single entry's list after the entry and its codes", () => {
    const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal({
      entries: [
        _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)]),
      ],
    });
    expect(codeLists).toHaveLength(1);
    expect(codeLists[0]?.name).toBe("GENDER (1/2/9)");
    expect(codeLists[0]?.entryKeys).toEqual(["k:GENDER"]);
    expect(codeListKeysByEntryKey["k:GENDER"]).toEqual([codeLists[0]?.key]);
  });

  it("gives an entry with other codes a second list, the larger first", () => {
    const entry = _entry(
      "GENDER",
      "categorical",
      [_column("GENDER", SEX_COUNTS)],
      {
        suggestedColumns: [_column("sex", { M: 120, F: 110, U: 5 }, ERIE_ID)],
        suggestionReason: "other_codes",
      },
    );
    const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal({
      entries: [entry],
    });
    const names = (codeListKeysByEntryKey["k:GENDER"] ?? []).map((key) => {
      return codeLists.find((list) => {
        return list.key === key;
      })?.name;
    });
    expect(names).toEqual(["GENDER (1/2/9)", "GENDER (M/F/U)"]);
  });

  it("merges spellings that differ only in case into one code", () => {
    const entry = _entry("sex", "categorical", [
      _column("sex", { M: 100 }),
      _column("sex", { m: 20, F: 90 }, ERIE_ID),
    ]);
    const { codeLists } = getCodingsFromProposal({ entries: [entry] });
    expect(codeLists[0]?.values).toEqual([
      { value: "M", rowCount: 120 },
      { value: "F", rowCount: 90 },
    ]);
  });

  it("shares one list between entries with the same codes and first word", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("symptom_fever", "categorical", [
          _column("symptom_fever", YES_NO_UNKNOWN),
        ]),
        _entry("symptom_rash", "categorical", [
          _column("symptom_rash", YES_NO_UNKNOWN),
        ]),
      ],
    });
    expect(codeLists).toHaveLength(1);
    expect(codeLists[0]?.name).toBe("symptom (1/2/9)");
    expect(codeLists[0]?.entryKeys).toEqual([
      "k:symptom_fever",
      "k:symptom_rash",
    ]);
  });

  it("shares one list between entries whose codes are the same words, whatever their names", () => {
    const yesNoUnknown = { Y: 50, N: 40, U: 5 };
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("fever", "categorical", [_column("fever", yesNoUnknown)]),
        _entry("rash", "categorical", [_column("rash", yesNoUnknown)]),
        _entry("cough", "categorical", [_column("cough", yesNoUnknown)]),
      ],
    });
    expect(codeLists).toHaveLength(1);
    expect(codeLists[0]?.name).toBe("fever, rash, cough (Y/N/U)");
  });

  it("keeps word codes apart when they are not the same", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("fever", "categorical", [
          _column("fever", { Y: 50, N: 40, U: 5 }),
        ]),
        _entry("hosp_yn", "categorical", [
          _column("hosp_yn", { Y: 50, N: 40 }),
        ]),
      ],
    });
    expect(codeLists).toHaveLength(2);
  });

  it("keeps a list's key when its entry is renamed", () => {
    const entry = _entry("GENDER", "categorical", [
      _column("GENDER", SEX_COUNTS),
    ]);
    const before = getCodingsFromProposal({ entries: [entry] }).codeLists[0];
    const after = getCodingsFromProposal({
      entries: [{ ...entry, name: "sex_at_intake" }],
    }).codeLists[0];
    expect(after?.key).toBe(before?.key);
    expect(after?.name).toBe("sex_at_intake (1/2/9)");
  });

  it("keeps entries with the same numeric codes but another first word apart", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)]),
        _entry("fever", "categorical", [_column("fever", SEX_COUNTS)]),
      ],
    });
    expect(codeLists).toHaveLength(2);
  });

  it("keeps an ordered list in scale order", () => {
    const { codeLists } = getCodingsFromProposal({
      entries: [
        _entry("ses_cat", "ordered", [
          _column("ses_cat", { "4": 50, "1": 100, "3": 70, "2": 90 }),
        ]),
      ],
    });
    expect(codeLists[0]?.isOrdered).toBe(true);
    expect(
      codeLists[0]?.values.map((item) => {
        return item.value;
      }),
    ).toEqual(["1", "2", "3", "4"]);
  });

  it("gives excluded and description-only entries no list", () => {
    const { codeLists, codeListKeysByEntryKey } = getCodingsFromProposal({
      entries: [
        _entry("GENDER", "categorical", [_column("GENDER", SEX_COUNTS)], {
          isIncluded: false,
        }),
        _entry("case_id", "identifier", [_column("case_id", { A1: 1 })]),
      ],
    });
    expect(codeLists).toEqual([]);
    expect(codeListKeysByEntryKey).toEqual({});
  });
});
