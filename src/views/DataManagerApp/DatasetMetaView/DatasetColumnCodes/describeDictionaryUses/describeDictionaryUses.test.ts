import { describe, expect, it } from "vitest";
import { describeDictionaryUses } from "@/views/DataManagerApp/DatasetMetaView/DatasetColumnCodes/describeDictionaryUses/describeDictionaryUses";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** A column's codes, as Task 13's `ColumnCodes.fromRows` returns them. */
function makeCodes(overrides: Partial<ColumnCodes.T> = {}): ColumnCodes.T {
  return {
    datasetColumnId: "col-gender",
    dictionaryId: "dict-nys",
    dictionaryName: "NYS codes",
    entryName: "sex",
    codeListName: "Sex (1/2/9)",
    isOrdered: false,
    mode: "reference",
    direction: "decode",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
    ],
    isPinned: false,
    appliedDictionaryVersion: 1,
    currentDictionaryVersion: 1,
    isSourceDeleted: false,
    keepsOriginal: false,
    ...overrides,
  };
}

function _byColumn(
  ...codes: readonly ColumnCodes.T[]
): Map<string, ColumnCodes.T> {
  return new Map(
    codes.map((columnCodes) => {
      return [columnCodes.datasetColumnId, columnCodes] as const;
    }),
  );
}

describe("describeDictionaryUses", () => {
  it("says a reference-only dictionary is attached as reference", () => {
    expect(describeDictionaryUses(_byColumn(makeCodes()), [])).toEqual([
      {
        dictionaryId: "dict-nys",
        dictionaryName: "NYS codes",
        notes: [{ kind: "reference" }],
      },
    ]);
  });

  it("gives a dataset converted in place its oldest applied version and the current one", () => {
    const uses = describeDictionaryUses(
      _byColumn(
        makeCodes({
          datasetColumnId: "col-gender",
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 3,
          currentDictionaryVersion: 4,
        }),
        makeCodes({
          datasetColumnId: "col-race",
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 2,
          currentDictionaryVersion: 4,
        }),
      ),
      [],
    );

    expect(uses[0]?.notes).toEqual([
      {
        kind: "converted_pinned",
        appliedVersion: 2,
        currentVersion: 4,
        canReapply: true,
      },
    ]);
  });

  it("says a linked dataset's own conversions follow the dictionary", () => {
    const uses = describeDictionaryUses(
      _byColumn(makeCodes({ mode: "convert", direction: "encode" })),
      [],
    );

    expect(uses[0]?.notes).toEqual([{ kind: "converted_live" }]);
  });

  it("names each linked dataset that converts with the dictionary", () => {
    const uses = describeDictionaryUses(_byColumn(makeCodes()), [
      {
        id: "dataset-labeled" as Dataset.Id,
        name: "Kings (labeled)",
        dictionaryIds: new Set(["dict-nys"]),
      },
      {
        id: "dataset-other" as Dataset.Id,
        name: "Kings (other)",
        dictionaryIds: new Set(["dict-cdc"]),
      },
    ]);

    expect(uses[0]?.notes).toEqual([
      { kind: "reference" },
      {
        kind: "linked",
        datasetId: "dataset-labeled",
        datasetName: "Kings (labeled)",
      },
    ]);
  });

  it("lists dictionaries by name, and a deleted one last", () => {
    const uses = describeDictionaryUses(
      _byColumn(
        makeCodes({
          datasetColumnId: "col-a",
          dictionaryId: "",
          dictionaryName: "",
          entryName: "",
          mode: "convert",
          direction: "encode",
          isPinned: true,
          isSourceDeleted: true,
          currentDictionaryVersion: undefined,
        }),
        makeCodes({
          datasetColumnId: "col-b",
          dictionaryId: "dict-z",
          dictionaryName: "Zip codes",
        }),
        makeCodes({ datasetColumnId: "col-c" }),
      ),
      [],
    );

    expect(
      uses.map((use) => {
        return use.dictionaryName;
      }),
    ).toEqual(["NYS codes", "Zip codes", ""]);
  });
});
