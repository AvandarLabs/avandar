import { describe, expect, it } from "vitest";
import {
  columnFill,
  SEX_CODES_LIST_ID,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/__tests__/mapStep.fixtures";
import { makeFillForKind } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/MappingPane/makeFillForKind/makeFillForKind";

const COLUMN_NAMES = ["CaseNo", "GENDER", "Sex"];

describe("makeFillForKind", () => {
  it("keeps the fill when its kind is chosen again", () => {
    const current = columnFill("GENDER");
    expect(
      makeFillForKind({
        kind: "column",
        current,
        targetName: "sex",
        columnNames: COLUMN_NAMES,
        primaryCodeListId: undefined,
      }),
    ).toBe(current);
  });

  it("starts a column fill from the column named like the target, translating a governed one", () => {
    expect(
      makeFillForKind({
        kind: "column",
        current: { kind: "empty" },
        targetName: "sex",
        columnNames: COLUMN_NAMES,
        primaryCodeListId: SEX_CODES_LIST_ID,
      }),
    ).toEqual({ ...columnFill("Sex"), codeListId: SEX_CODES_LIST_ID });
  });

  it("falls back to the first column, and starts Combine as that column's placeholder", () => {
    const options = {
      current: undefined,
      targetName: "county",
      columnNames: COLUMN_NAMES,
      primaryCodeListId: undefined,
    };
    expect(makeFillForKind({ ...options, kind: "column" })).toEqual(
      columnFill("CaseNo"),
    );
    expect(makeFillForKind({ ...options, kind: "expression" })).toEqual({
      kind: "expression",
      sql: "{CaseNo}",
    });
  });

  it("starts Combine from the current column fill's source", () => {
    expect(
      makeFillForKind({
        kind: "expression",
        current: columnFill("GENDER"),
        targetName: "sex",
        columnNames: COLUMN_NAMES,
        primaryCodeListId: undefined,
      }),
    ).toEqual({ kind: "expression", sql: "{GENDER}" });
  });

  it("starts a fixed value blank and an empty fill empty", () => {
    const options = {
      current: columnFill("GENDER"),
      targetName: "sex",
      columnNames: COLUMN_NAMES,
      primaryCodeListId: undefined,
    };
    expect(makeFillForKind({ ...options, kind: "constant" })).toEqual({
      kind: "constant",
      value: "",
    });
    expect(makeFillForKind({ ...options, kind: "empty" })).toEqual({
      kind: "empty",
    });
  });
});
