import { describe, expect, it } from "vitest";
import { CrosswalkSql } from "$/models/crosswalks/CrosswalkSql/CrosswalkSql.ts";
import type { CrosswalkColumn } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.ts";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.ts";
import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

function _pair(
  code: string,
  label: string,
  acceptedSpellings: string[] = [],
): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings, isMissing: false };
}

const SEX_129 = [
  _pair("1", "Male"),
  _pair("2", "Female"),
  _pair("9", "Unknown"),
];
const SEX_MFU = [
  _pair("M", "male", ["man"]),
  _pair("F", "Female"),
  _pair("X", "Other"),
];

const LIST_129 = "11111111-1111-4111-8111-111111111111";
const LIST_MFU = "22222222-2222-4222-8222-222222222222";
const ENTRY_SEX =
  "33333333-3333-4333-8333-333333333333" as DataDictionaryEntry.Id;

const CODE_LISTS: CrosswalkSql.CodeLists = {
  codeListsById: new Map([
    [LIST_129, { pairs: SEX_129 }],
    [LIST_MFU, { pairs: SEX_MFU }],
  ]),
  primaryCodeListIdByEntryId: new Map([[ENTRY_SEX as string, LIST_129]]),
};

function _column(
  name: string,
  dataType: CrosswalkSql.Column["dataType"],
  entryId?: DataDictionaryEntry.Id,
): CrosswalkSql.Column {
  return { id: `col-${name}` as CrosswalkColumn.Id, name, dataType, entryId };
}

function _columnFill(
  sourceColumn: string,
  changes: Partial<Extract<CrosswalkMapping.Fill, { kind: "column" }>> = {},
): CrosswalkMapping.Fill {
  return {
    kind: "column",
    sourceColumn,
    convert: undefined,
    codeListId: undefined,
    holdsLabels: false,
    ...changes,
  };
}

function _fillSql(
  fill: CrosswalkMapping.Fill | undefined,
  column: CrosswalkSql.Column,
  codesOutputAs: "labels" | "codes" = "labels",
): string {
  return CrosswalkSql.toFillSql({ ...CODE_LISTS, fill, column, codesOutputAs });
}

describe("CrosswalkSql.toFillSql", () => {
  it("is a typed NULL for a column with no fill or an empty fill", () => {
    expect(_fillSql(undefined, _column("outbreak", "boolean"))).toBe(
      "CAST(NULL AS BOOLEAN)",
    );
    expect(_fillSql({ kind: "empty" }, _column("age", "double"))).toBe(
      "CAST(NULL AS DOUBLE)",
    );
  });

  it("casts a text column plainly and any other with TRY_CAST", () => {
    expect(_fillSql(_columnFill("CaseNo"), _column("case_id", "varchar"))).toBe(
      'CAST("CaseNo" AS VARCHAR)',
    );
    expect(_fillSql(_columnFill("age"), _column("age", "bigint"))).toBe(
      'TRY_CAST("age" AS BIGINT)',
    );
  });

  it("reads a date with TRY_STRPTIME", () => {
    const fill = _columnFill("onset_dt", {
      convert: { kind: "parse_date", format: "%m/%d/%Y" },
    });

    expect(_fillSql(fill, _column("rash_onset_date", "date"))).toBe(
      `TRY_CAST(TRY_STRPTIME(CAST("onset_dt" AS VARCHAR), '%m/%d/%Y') AS DATE)`,
    );
  });

  it("pads only a shorter digit string, never truncating", () => {
    const fill = _columnFill("zip", {
      convert: { kind: "pad_text", length: 5 },
    });

    expect(_fillSql(fill, _column("zip", "varchar"))).toBe(
      `TRY_CAST(CASE WHEN regexp_full_match(trim(CAST("zip" AS VARCHAR)), '[0-9]+') AND length(trim(CAST("zip" AS VARCHAR))) < 5 THEN lpad(trim(CAST("zip" AS VARCHAR)), 5, '0') ELSE trim(CAST("zip" AS VARCHAR)) END AS VARCHAR)`,
    );
  });

  it("multiplies by the factor as JavaScript writes it", () => {
    const fill = _columnFill("age_mo", {
      convert: { kind: "multiply", factor: 1 / 12 },
    });

    expect(_fillSql(fill, _column("age_years", "double"))).toBe(
      `TRY_CAST(TRY_CAST("age_mo" AS DOUBLE) * 0.08333333333333333 AS DOUBLE)`,
    );
  });

  it("refuses a factor that is not finite", () => {
    const fill = _columnFill("age_mo", {
      convert: { kind: "multiply", factor: Number.POSITIVE_INFINITY },
    });

    expect(() => {
      return _fillSql(fill, _column("age_years", "double"));
    }).toThrow("finite");
  });

  it("trims, squashes spaces, and fixes the case", () => {
    const upper = _columnFill("name", {
      convert: { kind: "trim_and_fix_case", letterCase: "upper" },
    });
    const keep = _columnFill("name", {
      convert: { kind: "trim_and_fix_case", letterCase: "keep" },
    });

    expect(_fillSql(upper, _column("name", "varchar"))).toBe(
      `TRY_CAST(upper(regexp_replace(trim(CAST("name" AS VARCHAR)), '\\s+', ' ', 'g')) AS VARCHAR)`,
    );
    expect(_fillSql(keep, _column("name", "varchar"))).toBe(
      `TRY_CAST(regexp_replace(trim(CAST("name" AS VARCHAR)), '\\s+', ' ', 'g') AS VARCHAR)`,
    );
  });

  it("decodes through the code list", () => {
    const fill = _columnFill("GENDER", {
      codeListId: LIST_129 as DataDictionaryCodeList.Id,
    });

    expect(_fillSql(fill, _column("sex", "varchar", ENTRY_SEX))).toBe(
      `TRY_CAST(CASE lower(trim(CAST("GENDER" AS VARCHAR))) WHEN lower(trim('1')) THEN 'Male' WHEN lower(trim('2')) THEN 'Female' WHEN lower(trim('9')) THEN 'Unknown' ELSE CAST("GENDER" AS VARCHAR) END AS VARCHAR)`,
    );
  });

  it("leaves the values unconverted when the code list is gone", () => {
    const fill = _columnFill("GENDER", {
      codeListId:
        "99999999-9999-4999-8999-999999999999" as DataDictionaryCodeList.Id,
    });

    expect(_fillSql(fill, _column("sex", "varchar", ENTRY_SEX))).toBe(
      'CAST("GENDER" AS VARCHAR)',
    );
  });

  it("writes a fixed value as a literal, cast unless text", () => {
    expect(
      _fillSql(
        { kind: "constant", value: "O'Brien" },
        _column("county", "varchar"),
      ),
    ).toBe(`'O''Brien'`);
    expect(
      _fillSql({ kind: "constant", value: "2026" }, _column("year", "bigint")),
    ).toBe(`TRY_CAST('2026' AS BIGINT)`);
  });

  it("quotes each Combine placeholder as an identifier, even one with a space or $&, keeping its spaces", () => {
    const fill: CrosswalkMapping.Fill = {
      kind: "expression",
      sql: "concat({Case No}, '-', {$&}, { padded })",
    };

    expect(_fillSql(fill, _column("case_id", "varchar"))).toBe(
      `TRY_CAST((concat("Case No", '-', "$&", " padded ")) AS VARCHAR)`,
    );
  });
});

describe("CrosswalkSql.getTranslationOutputs", () => {
  it("outputs each pair's own label when the list is the primary one", () => {
    expect(
      CrosswalkSql.getTranslationOutputs({
        pairs: SEX_129,
        primaryPairs: SEX_129,
        isPrimaryList: true,
        codesOutputAs: "labels",
      }).map(({ output }) => {
        return output;
      }),
    ).toEqual(["Male", "Female", "Unknown"]);
  });

  it("outputs the primary list's labels for a second coding, by label or accepted spelling", () => {
    const outputs = CrosswalkSql.getTranslationOutputs({
      pairs: [_pair("M", " MALE "), _pair("F", "fem"), _pair("X", "Other")],
      primaryPairs: [_pair("1", "Male"), _pair("2", "Female", ["fem"])],
      isPrimaryList: false,
      codesOutputAs: "labels",
    });

    expect(
      outputs.map(({ output }) => {
        return output;
      }),
    ).toEqual(["Male", "Female", "Other"]);
  });

  it("outputs the primary list's codes in codes mode, and nothing for a pair with no counterpart", () => {
    expect(
      CrosswalkSql.getTranslationOutputs({
        pairs: SEX_MFU,
        primaryPairs: SEX_129,
        isPrimaryList: false,
        codesOutputAs: "codes",
      }).map(({ output }) => {
        return output;
      }),
    ).toEqual(["1", "2", undefined]);
  });
});

describe("CrosswalkSql.toTranslation", () => {
  it("decodes a second coding to the primary list's labels", () => {
    const conversion = CrosswalkSql.toTranslation({
      pairs: SEX_MFU,
      primaryPairs: SEX_129,
      isPrimaryList: false,
      holdsLabels: false,
      codesOutputAs: "labels",
    });

    expect(conversion.direction).toBe("decode");
    expect(
      conversion.pairs.map((pair) => {
        return [pair.code, pair.label];
      }),
    ).toEqual([
      ["M", "Male"],
      ["F", "Female"],
      ["X", "Other"],
    ]);
    expect(conversion.overrides).toEqual([]);
  });

  it("empties a code with no counterpart in codes mode rather than passing it through", () => {
    const conversion = CrosswalkSql.toTranslation({
      pairs: SEX_MFU,
      primaryPairs: SEX_129,
      isPrimaryList: false,
      holdsLabels: false,
      codesOutputAs: "codes",
    });

    expect(
      conversion.pairs.map((pair) => {
        return [pair.code, pair.label];
      }),
    ).toEqual([
      ["M", "1"],
      ["F", "2"],
    ]);
    expect(conversion.overrides).toEqual([{ value: "X", action: "empty" }]);
  });

  it("encodes labels and accepted spellings to the primary codes, emptying every spelling with no counterpart", () => {
    const conversion = CrosswalkSql.toTranslation({
      pairs: SEX_MFU,
      primaryPairs: SEX_129,
      isPrimaryList: false,
      holdsLabels: true,
      codesOutputAs: "codes",
    });

    expect(conversion.direction).toBe("encode");
    expect(
      conversion.pairs.map((pair) => {
        return [pair.code, pair.label, pair.acceptedSpellings];
      }),
    ).toEqual([
      ["1", "male", ["man"]],
      ["2", "Female", []],
    ]);
    expect(conversion.overrides).toEqual([{ value: "Other", action: "empty" }]);
  });

  it("lets a code whose label is blank pass through in labels mode", () => {
    const conversion = CrosswalkSql.toTranslation({
      pairs: [_pair("1", "Male"), _pair("5", " ")],
      primaryPairs: [_pair("1", "Male"), _pair("5", " ")],
      isPrimaryList: true,
      holdsLabels: false,
      codesOutputAs: "labels",
    });

    expect(
      conversion.pairs.map((pair) => {
        return pair.code;
      }),
    ).toEqual(["1"]);
    expect(conversion.overrides).toEqual([]);
  });
});

describe("CrosswalkSql.getGovernedDataType", () => {
  it("is text in labels mode", () => {
    expect(
      CrosswalkSql.getGovernedDataType({
        codesOutputAs: "labels",
        primaryPairs: SEX_129,
      }),
    ).toBe("varchar");
  });

  it("is a whole number in codes mode when every primary code is one", () => {
    expect(
      CrosswalkSql.getGovernedDataType({
        codesOutputAs: "codes",
        primaryPairs: SEX_129,
      }),
    ).toBe("bigint");
    expect(
      CrosswalkSql.getGovernedDataType({
        codesOutputAs: "codes",
        primaryPairs: SEX_MFU,
      }),
    ).toBe("varchar");
  });
});

describe("CrosswalkSql.getCodeListFingerprint", () => {
  it("is stable across calls", () => {
    expect(CrosswalkSql.getCodeListFingerprint(SEX_129)).toBe(
      CrosswalkSql.getCodeListFingerprint(
        SEX_129.map((pair) => {
          return { ...pair };
        }),
      ),
    );
    expect(CrosswalkSql.getCodeListFingerprint(SEX_129)).toMatch(
      /^p1\.[0-9a-f]{16}$/,
    );
  });

  it("changes when a label changes", () => {
    expect(
      CrosswalkSql.getCodeListFingerprint([
        _pair("1", "Man"),
        ...SEX_129.slice(1),
      ]),
    ).not.toBe(CrosswalkSql.getCodeListFingerprint(SEX_129));
  });

  it("ignores the order of a pair's keys", () => {
    const reordered = SEX_129.map((pair) => {
      return {
        isMissing: pair.isMissing,
        acceptedSpellings: pair.acceptedSpellings,
        label: pair.label,
        code: pair.code,
      };
    });

    expect(CrosswalkSql.getCodeListFingerprint(reordered)).toBe(
      CrosswalkSql.getCodeListFingerprint(SEX_129),
    );
  });
});

describe("CrosswalkSql.compile", () => {
  const CASE_ID = _column("case_id", "varchar");
  const SEX = _column("sex", "varchar", ENTRY_SEX);
  const KINGS: CrosswalkSql.Layout = {
    layoutId: "layout-kings" as CrosswalkLayout.Id,
    datasets: [
      { id: "dataset-k1" as Dataset.Id, name: "Kings 2026-03" },
      { id: "dataset-k2" as Dataset.Id, name: "Kings O'Brien" },
    ],
    fillsByColumnId: new Map([
      [CASE_ID.id as string, _columnFill("CaseNo")],
      [
        SEX.id as string,
        _columnFill("GENDER", {
          codeListId: LIST_129 as DataDictionaryCodeList.Id,
        }),
      ],
    ]),
  };
  const QUEENS: CrosswalkSql.Layout = {
    layoutId: "layout-queens" as CrosswalkLayout.Id,
    datasets: [{ id: "dataset-q1" as Dataset.Id, name: "Queens 2026-03" }],
    fillsByColumnId: new Map([[CASE_ID.id as string, _columnFill("case_id")]]),
  };

  function _compile(
    changes: Partial<CrosswalkSql.Input> = {},
  ): CrosswalkSql.Output {
    return CrosswalkSql.compile({
      ...CODE_LISTS,
      codesOutputAs: "labels",
      sourceColumnName: "source_dataset",
      columns: [CASE_ID, SEX],
      layouts: [KINGS, QUEENS],
      ...changes,
    });
  }

  it("stacks each layout's datasets under their names, then the layouts, every output aliased", () => {
    expect(_compile({ columns: [CASE_ID] }).sql).toBe(
      [
        `SELECT CAST("__ava_source_dataset" AS VARCHAR) AS "source_dataset",`,
        `  CAST("CaseNo" AS VARCHAR) AS "case_id"`,
        `FROM (`,
        `  SELECT 'Kings 2026-03' AS "__ava_source_dataset", * FROM "dataset-k1"`,
        `  UNION ALL BY NAME`,
        `  SELECT 'Kings O''Brien' AS "__ava_source_dataset", * FROM "dataset-k2"`,
        `)`,
        `UNION ALL BY NAME`,
        `SELECT CAST("__ava_source_dataset" AS VARCHAR) AS "source_dataset",`,
        `  CAST("case_id" AS VARCHAR) AS "case_id"`,
        `FROM (`,
        `  SELECT 'Queens 2026-03' AS "__ava_source_dataset", * FROM "dataset-q1"`,
        `)`,
      ].join("\n"),
    );
  });

  it("leaves out the dataset names without a source column", () => {
    const output = _compile({
      columns: [CASE_ID],
      sourceColumnName: undefined,
      layouts: [QUEENS],
    });

    expect(output.sql).toBe(
      [
        `SELECT CAST("case_id" AS VARCHAR) AS "case_id"`,
        `FROM (`,
        `  SELECT * FROM "dataset-q1"`,
        `)`,
      ].join("\n"),
    );
    expect(output.columns).toEqual([{ name: "case_id", dataType: "varchar" }]);
  });

  it("fills a column a layout has no fill for with a typed NULL", () => {
    const sql = _compile({ layouts: [QUEENS] }).sql;

    expect(sql).toContain(`CAST(NULL AS VARCHAR) AS "sex"`);
  });

  it("keeps layouts in the given order", () => {
    const sql = _compile({ layouts: [QUEENS, KINGS] }).sql;

    expect(sql.indexOf("dataset-q1")).toBeLessThan(sql.indexOf("dataset-k1"));
  });

  it("outputs the source column first, then the columns in order", () => {
    expect(_compile().columns).toEqual([
      { name: "source_dataset", dataType: "varchar" },
      { name: "case_id", dataType: "varchar" },
      { name: "sex", dataType: "varchar" },
    ]);
  });

  it("lists every code list a translation embedded, with the primary list a second coding reconciles to", () => {
    const mfuLayout: CrosswalkSql.Layout = {
      ...QUEENS,
      fillsByColumnId: new Map([
        [
          SEX.id as string,
          _columnFill("sex", {
            codeListId: LIST_MFU as DataDictionaryCodeList.Id,
          }),
        ],
      ]),
    };

    expect(_compile({ layouts: [mfuLayout] }).usedCodeListIds).toEqual([
      LIST_129,
      LIST_MFU,
    ]);
    expect(_compile({ layouts: [QUEENS] }).usedCodeListIds).toEqual([]);
  });

  it("skips a layout with no dataset", () => {
    const sql = _compile({ layouts: [{ ...KINGS, datasets: [] }, QUEENS] }).sql;

    expect(sql).not.toContain("dataset-k1");
  });

  it("refuses to compile when no layout has a dataset", () => {
    expect(() => {
      return _compile({ layouts: [{ ...QUEENS, datasets: [] }] });
    }).toThrow("crosswalk-nothing-to-combine");
  });
});

describe("CrosswalkSql.toExpressionSql", () => {
  it("replaces each placeholder with the column's quoted identifier", () => {
    expect(
      CrosswalkSql.toExpressionSql(`{first name} || ' ' || {say "hi"}`),
    ).toBe(`"first name" || ' ' || "say ""hi"""`);
  });
});
