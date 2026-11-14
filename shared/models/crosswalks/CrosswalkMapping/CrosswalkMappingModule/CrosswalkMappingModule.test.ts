import { describe, expect, it } from "vitest";
import { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";

const SEX_LIST =
  "55555555-5555-4555-8555-555555555555" as DataDictionaryCodeList.Id;

const FILLS: ReadonlyArray<readonly [string, CrosswalkMapping.Fill]> = [
  [
    "a column translated through a code list",
    {
      kind: "column",
      sourceColumn: "GENDER",
      convert: undefined,
      codeListId: SEX_LIST,
      holdsLabels: false,
    },
  ],
  [
    "a column read as a date",
    {
      kind: "column",
      sourceColumn: "onset_dt",
      convert: { kind: "parse_date", format: "%m/%d/%Y" },
      codeListId: undefined,
      holdsLabels: false,
    },
  ],
  [
    "a column padded with zeros",
    {
      kind: "column",
      sourceColumn: "zip",
      convert: { kind: "pad_text", length: 5 },
      codeListId: undefined,
      holdsLabels: false,
    },
  ],
  [
    "a column multiplied",
    {
      kind: "column",
      sourceColumn: "age_mo",
      convert: { kind: "multiply", factor: 1 / 12 },
      codeListId: undefined,
      holdsLabels: false,
    },
  ],
  [
    "a column trimmed and uppercased",
    {
      kind: "column",
      sourceColumn: "name",
      convert: { kind: "trim_and_fix_case", letterCase: "upper" },
      codeListId: undefined,
      holdsLabels: false,
    },
  ],
  ["a fixed value", { kind: "constant", value: "Bronx" }],
  [
    "a Combine expression",
    { kind: "expression", sql: "concat({first_name}, ' ', {last_name})" },
  ],
  ["an empty column", { kind: "empty" }],
];

describe("CrosswalkMapping.fillToDBJson and fillFromDBJson", () => {
  it.each(FILLS)("round-trips %s", (_label, fill) => {
    expect(
      CrosswalkMapping.fillFromDBJson(CrosswalkMapping.fillToDBJson(fill)),
    ).toEqual(fill);
  });

  it("writes version 1 in snake_case with nulls for what is not set", () => {
    expect(
      CrosswalkMapping.fillToDBJson({
        kind: "column",
        sourceColumn: "name",
        convert: { kind: "trim_and_fix_case", letterCase: "lower" },
        codeListId: undefined,
        holdsLabels: true,
      }),
    ).toEqual({
      version: 1,
      kind: "column",
      source_column: "name",
      convert: { kind: "trim_and_fix_case", letter_case: "lower" },
      code_list_id: null,
      holds_labels: true,
    });
  });
});

describe("CrosswalkMapping.fillFromDBJson", () => {
  it("refuses a column fill that both converts and translates codes", () => {
    expect(() => {
      return CrosswalkMapping.fillFromDBJson({
        version: 1,
        kind: "column",
        source_column: "GENDER",
        convert: { kind: "pad_text", length: 2 },
        code_list_id: SEX_LIST,
        holds_labels: false,
      });
    }).toThrow("either converts or translates");
  });

  it("refuses a version it does not know", () => {
    expect(() => {
      return CrosswalkMapping.fillFromDBJson({ version: 2, kind: "empty" });
    }).toThrow("Unknown crosswalk fill version: 2");
  });

  it("refuses a fill with no version", () => {
    expect(() => {
      return CrosswalkMapping.fillFromDBJson({ kind: "empty" });
    }).toThrow();
  });

  it("refuses a column fill with a blank source column", () => {
    expect(() => {
      return CrosswalkMapping.fillFromDBJson({
        version: 1,
        kind: "column",
        source_column: "  ",
        convert: null,
        code_list_id: null,
        holds_labels: false,
      });
    }).toThrow();
  });
});

describe("CrosswalkMapping.getCombineColumnNames", () => {
  it("reads a placeholder whose column name has a space", () => {
    expect(
      CrosswalkMapping.getCombineColumnNames("upper({Case No}) || '-'"),
    ).toEqual(["Case No"]);
  });

  it("lists each name once, exactly as written, in order of first use", () => {
    expect(
      CrosswalkMapping.getCombineColumnNames(
        "concat({last_name}, ', ', {first_name}, {last_name})",
      ),
    ).toEqual(["last_name", "first_name"]);
  });

  it("keeps the spaces inside a placeholder, as the column is spelled", () => {
    expect(
      CrosswalkMapping.getCombineColumnNames(
        "concat({ last_name }, {last_name})",
      ),
    ).toEqual([" last_name ", "last_name"]);
  });

  it("ignores a blank placeholder", () => {
    expect(CrosswalkMapping.getCombineColumnNames("{ } || {zip}")).toEqual([
      "zip",
    ]);
  });
});
