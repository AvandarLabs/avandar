import { describe, expect, it } from "vitest";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding.ts";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";

const SEX_PAIRS: DataDictionaryCodeList.Pair[] = [
  {
    code: "1",
    label: "Male",
    acceptedSpellings: ["M", "man"],
    isMissing: false,
  },
  { code: "2", label: "Female", acceptedSpellings: ["F"], isMissing: false },
  { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
];

const SES_PAIRS: DataDictionaryCodeList.Pair[] = [
  { code: "1", label: "Low", acceptedSpellings: [], isMissing: false },
  { code: "2", label: "High", acceptedSpellings: [], isMissing: false },
  { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
  { code: "99", label: "Unknown", acceptedSpellings: [], isMissing: true },
  { code: "5", label: " ", acceptedSpellings: [], isMissing: false },
];

function _makeConversion(
  overrides: Partial<ColumnConversion.T> = {},
): ColumnConversion.T {
  return {
    datasetColumnId: "col-gender",
    direction: "decode",
    pairs: SEX_PAIRS,
    isOrdered: false,
    overrides: [],
    keepsOriginalAs: undefined,
    outputDataType: "varchar",
    inputDataType: undefined,
    ...overrides,
  };
}

function _pair(code: string, label = "x"): DataDictionaryCodeList.Pair {
  return { code, label, acceptedSpellings: [], isMissing: false };
}

describe("ColumnConversion.getCases", () => {
  it("decodes each code to its label, in list order", () => {
    expect(ColumnConversion.getCases(_makeConversion())).toEqual([
      { match: "1", output: "Male" },
      { match: "2", output: "Female" },
      { match: "9", output: "Unknown" },
    ]);
  });

  it("skips a pair with a blank label when decoding, so its code passes through", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({ pairs: [_pair("1", "Low"), _pair("5", "  ")] }),
    );

    expect(cases).toEqual([{ match: "1", output: "Low" }]);
  });

  it("encodes each label and accepted spelling to its code", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({ direction: "encode" }),
    );

    expect(cases).toEqual([
      { match: "Male", output: "1" },
      { match: "M", output: "1" },
      { match: "man", output: "1" },
      { match: "Female", output: "2" },
      { match: "F", output: "2" },
      { match: "Unknown", output: "9" },
    ]);
  });

  it("still encodes the accepted spellings of a pair with a blank label", () => {
    const pairs = [
      { code: "1", label: "", acceptedSpellings: ["m"], isMissing: false },
    ];

    expect(
      ColumnConversion.getCases(
        _makeConversion({ direction: "encode", pairs }),
      ),
    ).toEqual([{ match: "m", output: "1" }]);
  });

  it("renders overrides after the pairs: empty is null, map is the pair's output, keep is nothing", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({
        overrides: [
          { value: "7", action: "empty" },
          { value: "x", action: "keep" },
          { value: "f", action: "map", code: "2" },
          { value: "q", action: "map", code: "404" },
        ],
      }),
    );

    expect(cases.slice(3)).toEqual([
      { match: "7", output: null },
      { match: "f", output: "Female" },
    ]);
  });

  it("maps to the pair's code when encoding", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({
        direction: "encode",
        overrides: [{ value: "Mle", action: "map", code: "1" }],
      }),
    );

    expect(cases.at(-1)).toEqual({ match: "Mle", output: "1" });
  });

  it("maps to a pair whose code differs only in case and surrounding spaces, as the apply RPC accepts", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({
        pairs: [_pair("A1", "Alpha")],
        overrides: [{ value: "q", action: "map", code: " a1 " }],
      }),
    );

    expect(cases.at(-1)).toEqual({ match: "q", output: "Alpha" });
  });

  it("does not map to a code that differs by a tab, which the RPC's trim keeps", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({
        pairs: [_pair("A1", "Alpha")],
        overrides: [{ value: "q", action: "map", code: "\tA1" }],
      }),
    );

    expect(cases).toEqual([{ match: "A1", output: "Alpha" }]);
  });

  it("keeps a pair's case ahead of an override for the same value", () => {
    const cases = ColumnConversion.getCases(
      _makeConversion({ overrides: [{ value: "1", action: "empty" }] }),
    );

    expect(cases[0]).toEqual({ match: "1", output: "Male" });
    expect(cases.at(-1)).toEqual({ match: "1", output: null });
  });
});

describe("ColumnConversion.getOutputDataType", () => {
  it.each([
    [["1", "2", "9"], "bigint"],
    [["01", " 2 ", "-3"], "bigint"],
    [["1", "1.5"], "varchar"],
    [["1", "M"], "varchar"],
    [["123456789012345678"], "bigint"],
    [["1234567890123456789"], "varchar"],
    [["\t1"], "varchar"],
    [[], "varchar"],
  ])("encodes codes %j as %s", (codes, expected) => {
    const pairs = codes.map((code) => {
      return _pair(code);
    });

    expect(
      ColumnConversion.getOutputDataType({ direction: "encode", pairs }),
    ).toBe(expected);
  });

  it("decodes to text, whatever the codes", () => {
    expect(
      ColumnConversion.getOutputDataType({
        direction: "decode",
        pairs: [_pair("1")],
      }),
    ).toBe("varchar");
  });
});

describe("ColumnConversion.getOutputType", () => {
  it("is an ENUM of an ordered list's labels, blank ones left out and each once", () => {
    const outputType = ColumnConversion.getOutputType(
      _makeConversion({ pairs: SES_PAIRS, isOrdered: true }),
    );

    expect(outputType).toEqual({
      kind: "enum",
      labels: ["Low", "High", "Unknown"],
    });
  });

  it("is the stored type when encoding an ordered list", () => {
    const outputType = ColumnConversion.getOutputType(
      _makeConversion({
        direction: "encode",
        isOrdered: true,
        outputDataType: "bigint",
      }),
    );

    expect(outputType).toEqual({ kind: "bigint" });
  });

  it("is text when an ordered list has no label yet", () => {
    const outputType = ColumnConversion.getOutputType(
      _makeConversion({ pairs: [_pair("1", "")], isOrdered: true }),
    );

    expect(outputType).toEqual({ kind: "varchar" });
  });
});

describe("ColumnConversion.toCaseSql", () => {
  it("decodes over a key both sides normalize the same way, keeping the rest as text", () => {
    expect(
      ColumnConversion.toCaseSql({
        valueSql: '"GENDER"',
        conversion: _makeConversion(),
      }),
    ).toBe(
      `CASE lower(trim(CAST("GENDER" AS VARCHAR))) WHEN lower(trim('1')) THEN 'Male' WHEN lower(trim('2')) THEN 'Female' WHEN lower(trim('9')) THEN 'Unknown' ELSE CAST("GENDER" AS VARCHAR) END`,
    );
  });

  it("casts integer codes to BIGINT", () => {
    const sql = ColumnConversion.toCaseSql({
      valueSql: '"sex"',
      conversion: _makeConversion({
        direction: "encode",
        pairs: [SEX_PAIRS[0]!],
        outputDataType: "bigint",
      }),
    });

    expect(sql).toBe(
      `TRY_CAST(CASE lower(trim(CAST("sex" AS VARCHAR))) WHEN lower(trim('Male')) THEN '1' WHEN lower(trim('M')) THEN '1' WHEN lower(trim('man')) THEN '1' ELSE CAST("sex" AS VARCHAR) END AS BIGINT)`,
    );
  });

  it("casts an ordered list to an ENUM of its labels, then the kept values", () => {
    const sql = ColumnConversion.toCaseSql({
      valueSql: '"SES"',
      conversion: _makeConversion({
        pairs: [_pair("1", "Low"), _pair("2", "High")],
        isOrdered: true,
      }),
      keptValues: ["7", "Low"],
    });

    expect(sql).toBe(
      `CAST(CASE lower(trim(CAST("SES" AS VARCHAR))) WHEN lower(trim('1')) THEN 'Low' WHEN lower(trim('2')) THEN 'High' ELSE CAST("SES" AS VARCHAR) END AS ENUM('Low', 'High', '7'))`,
    );
  });

  it("leaves an ordered list as text without its kept values", () => {
    const sql = ColumnConversion.toCaseSql({
      valueSql: '"SES"',
      conversion: _makeConversion({ pairs: SES_PAIRS, isOrdered: true }),
    });

    expect(sql).not.toContain("ENUM");
  });

  it("keeps every value as text when nothing can match", () => {
    expect(
      ColumnConversion.toCaseSql({
        valueSql: '"GENDER"',
        conversion: _makeConversion({ pairs: [_pair("1", "")] }),
      }),
    ).toBe(`CAST("GENDER" AS VARCHAR)`);
  });

  it("quotes hostile labels as data", () => {
    const sql = ColumnConversion.toCaseSql({
      valueSql: '"v"',
      conversion: _makeConversion({
        pairs: [
          _pair("1", "O'Brien"),
          _pair("2", "$& $` $' $$ $excludeClause$"),
          _pair("3", "x' ) ; DROP TABLE raw; --"),
          _pair("4", "two\nlines"),
        ],
      }),
    });

    expect(sql).toContain(`THEN 'O''Brien'`);
    expect(sql).toContain(`THEN '$& $\` $'' $$ $excludeClause$'`);
    expect(sql).toContain(`THEN 'x'' ) ; DROP TABLE raw; --'`);
    expect(sql).toContain(`THEN 'two\nlines'`);
  });
});

describe("ColumnConversion.toKeptValuesSql", () => {
  it("selects the values kept beside an ordered list's labels, sorted", () => {
    const sql = ColumnConversion.toKeptValuesSql({
      relationSql: '"raw"',
      valueSql: '"SES"',
      conversion: _makeConversion({
        pairs: [_pair("1", "Low"), _pair("2", "High")],
        isOrdered: true,
      }),
    });

    expect(sql).toBe(
      `SELECT DISTINCT kept_value FROM (SELECT CASE lower(trim(CAST("SES" AS VARCHAR))) WHEN lower(trim('1')) THEN 'Low' WHEN lower(trim('2')) THEN 'High' ELSE CAST("SES" AS VARCHAR) END AS kept_value FROM "raw") WHERE kept_value IS NOT NULL AND kept_value NOT IN ('Low', 'High') ORDER BY kept_value`,
    );
  });
});

describe("ColumnConversion.toUnmatchedValuesSql", () => {
  it("counts the stored values no pair matches, most rows first", () => {
    const sql = ColumnConversion.toUnmatchedValuesSql({
      relationSql: '"raw"',
      valueSql: '"GENDER"',
      conversion: _makeConversion(),
      limit: 50,
    });

    expect(sql).toBe(
      `SELECT CAST("GENDER" AS VARCHAR) AS "value", count(*) AS "rows" FROM "raw" WHERE "GENDER" IS NOT NULL AND lower(trim(CAST("GENDER" AS VARCHAR))) NOT IN (lower(trim('1')), lower(trim('2')), lower(trim('9'))) GROUP BY 1 ORDER BY "rows" DESC, "value" LIMIT 50`,
    );
  });

  it("ignores overrides, so a resolved value is still listed", () => {
    const sql = ColumnConversion.toUnmatchedValuesSql({
      relationSql: '"raw"',
      valueSql: '"GENDER"',
      conversion: _makeConversion({
        overrides: [{ value: "7", action: "empty" }],
      }),
      limit: 50,
    });

    expect(sql).not.toContain("'7'");
  });

  it("counts every stored value when nothing can match", () => {
    const sql = ColumnConversion.toUnmatchedValuesSql({
      relationSql: '"raw"',
      valueSql: '"GENDER"',
      conversion: _makeConversion({ pairs: [] }),
      limit: 10,
    });

    expect(sql).not.toContain("NOT IN");
  });

  it.each([0, -1, 0.5])("refuses a limit of %s", (limit) => {
    expect(() => {
      return ColumnConversion.toUnmatchedValuesSql({
        relationSql: '"raw"',
        valueSql: '"GENDER"',
        conversion: _makeConversion(),
        limit,
      });
    }).toThrow("positive integer");
  });
});

describe("ColumnConversion.fromRows", () => {
  const LIST_ID = "list-sex" as DataDictionaryCodeList.Id;
  const BINDING_ID = "binding-gender" as DictionaryBinding.Id;
  const GENDER_ID = "col-gender" as DatasetColumn.Id;
  const BINDING: ColumnConversion.Rows["bindings"][number] = {
    id: BINDING_ID,
    datasetColumnId: GENDER_ID,
    codeListId: LIST_ID,
    mode: "convert",
    direction: "decode",
    keepsOriginal: true,
    valueOverrides: [{ value: "7", action: "empty" }],
    pinnedPairs: undefined,
    pinnedIsOrdered: undefined,
    replacedDataType: "bigint",
  };
  const ROWS: ColumnConversion.Rows = {
    bindings: [BINDING],
    codeLists: [{ id: LIST_ID, isOrdered: true, pairs: SEX_PAIRS }],
    columns: [
      { id: GENDER_ID, name: "GENDER", dataType: "varchar" },
      {
        id: "col-copy" as DatasetColumn.Id,
        name: "GENDER_original",
        dataType: "bigint",
        dictionaryBindingId: BINDING_ID,
      },
    ],
  };

  it("reads a live binding's list, overrides, copy name, and types", () => {
    expect(ColumnConversion.fromRows(ROWS).get(GENDER_ID)).toEqual({
      datasetColumnId: GENDER_ID,
      direction: "decode",
      pairs: SEX_PAIRS,
      isOrdered: true,
      overrides: [{ value: "7", action: "empty" }],
      keepsOriginalAs: "GENDER_original",
      outputDataType: "varchar",
      inputDataType: "bigint",
    });
  });

  it("converts with the pinned pairs when the binding has them", () => {
    const pinnedPairs = [_pair("1", "Man")];
    const conversion = ColumnConversion.fromRows({
      ...ROWS,
      bindings: [{ ...BINDING, pinnedPairs, pinnedIsOrdered: false }],
    }).get(GENDER_ID);

    expect(conversion?.pairs).toEqual(pinnedPairs);
    expect(conversion?.isOrdered).toBe(false);
  });

  it("still converts a pinned binding whose list was deleted", () => {
    const conversion = ColumnConversion.fromRows({
      ...ROWS,
      bindings: [
        {
          ...BINDING,
          codeListId: undefined,
          pinnedPairs: SEX_PAIRS,
          pinnedIsOrdered: false,
        },
      ],
      codeLists: [],
    }).get(GENDER_ID);

    expect(conversion?.pairs).toEqual(SEX_PAIRS);
  });

  it("leaves out a live binding whose list is not loaded", () => {
    expect(ColumnConversion.fromRows({ ...ROWS, codeLists: [] }).size).toBe(0);
  });

  it("leaves out a reference binding", () => {
    expect(
      ColumnConversion.fromRows({
        ...ROWS,
        bindings: [{ ...BINDING, mode: "reference" }],
      }).size,
    ).toBe(0);
  });

  it("leaves out a binding whose column is not loaded", () => {
    expect(ColumnConversion.fromRows({ ...ROWS, columns: [] }).size).toBe(0);
  });

  it("names no copy when the binding keeps no original", () => {
    const conversion = ColumnConversion.fromRows({
      ...ROWS,
      bindings: [{ ...BINDING, keepsOriginal: false }],
    }).get(GENDER_ID);

    expect(conversion?.keepsOriginalAs).toBeUndefined();
  });
});
