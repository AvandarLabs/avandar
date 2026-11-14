import { describe, expect, it } from "vitest";
import { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.ts";
import { fnv1a64Hex } from "$/utils/fnv1a64Hex/fnv1a64Hex.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const KINGS_COLUMNS = ["CaseNo", "GENDER", "onset_dt", "zip"];
const QUEENS_COLUMNS = ["case_id", "sex", "rash_onset", "zip_code"];
const BRONX_COLUMNS = ["CaseNo", "GENDER", "onset_dt", "zip", "county"];

function _dataset(
  id: string,
  name: string,
  columnNames: readonly string[],
): CrosswalkLayout.Dataset {
  return {
    id: id as Dataset.Id,
    name,
    columns: columnNames.map((columnName) => {
      return { name: columnName, dataType: "varchar" as const };
    }),
  };
}

function _group(
  key: string,
  columnNames: readonly string[],
  datasetCount: number,
): CrosswalkLayout.Group {
  return {
    key,
    signature: `sig-${key}`,
    columnNames: [...columnNames],
    datasetIds: Array.from({ length: datasetCount }, (_item, index) => {
      return `${key}-${index}` as Dataset.Id;
    }),
  };
}

describe("CrosswalkLayout.buildLayoutKey", () => {
  it("gives CaseNo and `caseno ` one key", () => {
    expect(CrosswalkLayout.buildLayoutKey(["CaseNo", "zip"])).toBe(
      CrosswalkLayout.buildLayoutKey(["caseno ", "ZIP"]),
    );
  });

  it("ignores column order", () => {
    expect(CrosswalkLayout.buildLayoutKey(["zip", "sex", "case_id"])).toBe(
      CrosswalkLayout.buildLayoutKey(["case_id", "zip", "sex"]),
    );
  });

  it("joins the sorted, normalized names with the unit separator", () => {
    expect(CrosswalkLayout.buildLayoutKey(["Zip", "CaseNo", "zip"])).toBe(
      "caseno\u001fzip",
    );
  });

  it("differs when a column is added", () => {
    expect(CrosswalkLayout.buildLayoutKey(KINGS_COLUMNS)).not.toBe(
      CrosswalkLayout.buildLayoutKey(BRONX_COLUMNS),
    );
  });
});

describe("CrosswalkLayout.buildSignature", () => {
  it("is the versioned hash of the layout key", () => {
    expect(CrosswalkLayout.buildSignature(["zip", "CaseNo"])).toBe(
      `l1.${fnv1a64Hex("caseno\u001fzip")}`,
    );
  });
});

describe("CrosswalkLayout.groupDatasetsByLayout", () => {
  const groups = CrosswalkLayout.groupDatasetsByLayout([
    _dataset("q1", "Queens 2026-03", QUEENS_COLUMNS),
    _dataset("k2", "Kings 2026-04", ["zip", "onset_dt", "gender", "caseno"]),
    _dataset("b1", "Bronx 2026-03", BRONX_COLUMNS),
    _dataset("k1", "Kings 2026-03", KINGS_COLUMNS),
  ]);

  it("orders layouts by dataset count, then by first dataset name", () => {
    expect(
      groups.map((group) => {
        return group.datasetIds;
      }),
    ).toEqual([["k1", "k2"], ["b1"], ["q1"]]);
  });

  it("names a layout's columns as its first dataset by name spells them", () => {
    expect(groups[0]?.columnNames).toEqual(KINGS_COLUMNS);
  });

  it("signs each layout from its key", () => {
    expect(groups[0]?.signature).toBe(
      CrosswalkLayout.buildSignature(KINGS_COLUMNS),
    );
    expect(groups[0]?.key).toBe(CrosswalkLayout.buildLayoutKey(KINGS_COLUMNS));
  });
});

describe("CrosswalkLayout.getCoverage", () => {
  it("counts zip_code as covered by zip, whose name score is 1", () => {
    expect(
      CrosswalkLayout.getCoverage({
        candidate: ["zip"],
        others: [{ columnNames: ["zip_code"], datasetCount: 1 }],
      }),
    ).toEqual({ matchedCount: 1, totalCount: 1 });
  });

  it("leaves out a name scoring under the match score (onset_date and rash_onset_date score 0.8)", () => {
    expect(
      CrosswalkLayout.getCoverage({
        candidate: ["onset_date"],
        others: [{ columnNames: ["rash_onset_date"], datasetCount: 1 }],
      }),
    ).toEqual({ matchedCount: 0, totalCount: 1 });
  });

  it("weights each layout's columns by its dataset count", () => {
    expect(
      CrosswalkLayout.getCoverage({
        candidate: KINGS_COLUMNS,
        others: [
          { columnNames: QUEENS_COLUMNS, datasetCount: 10 },
          { columnNames: BRONX_COLUMNS, datasetCount: 1 },
        ],
      }),
    ).toEqual({ matchedCount: 2 * 10 + 4, totalCount: 4 * 10 + 5 });
  });
});

describe("CrosswalkLayout.chooseReferenceLayout", () => {
  it("picks the layout covering the largest share of the others, over the one with more datasets", () => {
    // Bronx covers all of Kings (92 of 92) and half of Queens (20 of 40):
    // 112 of 132. Kings covers 24 of 45, Queens 48 of 97.
    expect(
      CrosswalkLayout.chooseReferenceLayout([
        _group("kings", KINGS_COLUMNS, 23),
        _group("queens", QUEENS_COLUMNS, 10),
        _group("bronx", BRONX_COLUMNS, 1),
      ]),
    ).toBe("bronx");
  });

  it("breaks a coverage tie by dataset count", () => {
    expect(
      CrosswalkLayout.chooseReferenceLayout([
        _group("one", ["postcode"], 1),
        _group("three", ["zip"], 3),
      ]),
    ).toBe("three");
  });

  it("breaks a coverage and dataset tie by column count", () => {
    expect(
      CrosswalkLayout.chooseReferenceLayout([
        _group("short", ["postcode"], 1),
        _group("long", ["zip", "zip_code"], 1),
      ]),
    ).toBe("long");
  });

  it("breaks a full tie by key", () => {
    expect(
      CrosswalkLayout.chooseReferenceLayout([
        _group("zip_code", ["zip_code"], 1),
        _group("zip", ["zip"], 1),
      ]),
    ).toBe("zip");
  });

  it("is undefined with no layouts", () => {
    expect(CrosswalkLayout.chooseReferenceLayout([])).toBeUndefined();
  });
});

describe("CrosswalkLayout.getNameOverlap", () => {
  it("is the share of names in common, ignoring case", () => {
    expect(
      CrosswalkLayout.getNameOverlap(KINGS_COLUMNS, ["caseno", "GENDER", "x"]),
    ).toBe(2 / 5);
  });
});

describe("CrosswalkLayout.findMostSimilarLayout", () => {
  const candidates = [
    { id: "kings" as CrosswalkLayout.Id, columnNames: KINGS_COLUMNS },
    { id: "queens" as CrosswalkLayout.Id, columnNames: QUEENS_COLUMNS },
  ];

  it("finds the layout sharing the most names", () => {
    expect(
      CrosswalkLayout.findMostSimilarLayout({
        columnNames: BRONX_COLUMNS,
        candidates,
      }),
    ).toBe("kings");
  });

  it("finds nothing under the default half overlap", () => {
    expect(
      CrosswalkLayout.findMostSimilarLayout({
        columnNames: ["case_id", "sex", "county", "district"],
        candidates,
      }),
    ).toBeUndefined();
  });

  it("honours a lower minOverlap", () => {
    expect(
      CrosswalkLayout.findMostSimilarLayout({
        columnNames: ["case_id", "sex", "county", "district"],
        candidates,
        minOverlap: 0.3,
      }),
    ).toBe("queens");
  });
});

describe("CrosswalkLayout.hasColumnsChanged", () => {
  const layoutKey = CrosswalkLayout.buildLayoutKey(KINGS_COLUMNS);

  it("is false for the same columns in another order and case", () => {
    expect(
      CrosswalkLayout.hasColumnsChanged({
        layoutKey,
        currentColumnNames: ["zip", "caseno", "gender", "ONSET_DT"],
      }),
    ).toBe(false);
  });

  it("is true once a column is added", () => {
    expect(
      CrosswalkLayout.hasColumnsChanged({
        layoutKey,
        currentColumnNames: BRONX_COLUMNS,
      }),
    ).toBe(true);
  });
});

describe("CrosswalkLayout.getStatusAfterFill", () => {
  it("is review once every column has a fill", () => {
    expect(
      CrosswalkLayout.getStatusAfterFill({
        columnIds: ["a", "b"],
        filledColumnIds: new Set(["a", "b", "c"]),
      }),
    ).toBe("review");
  });

  it("is to_do while a column has no fill", () => {
    expect(
      CrosswalkLayout.getStatusAfterFill({
        columnIds: ["a", "b"],
        filledColumnIds: new Set(["a"]),
      }),
    ).toBe("to_do");
  });

  it("is to_do while there are no columns", () => {
    expect(
      CrosswalkLayout.getStatusAfterFill({
        columnIds: [],
        filledColumnIds: new Set(),
      }),
    ).toBe("to_do");
  });
});
