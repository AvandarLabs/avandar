import { PluginError } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import { makeDerivedColumnsSqlFromColumns } from "@/lib/plugins/derivedColumns/makeDerivedColumnsSqlFromColumns/makeDerivedColumnsSqlFromColumns";
import type { DerivedColumn } from "@avandar/plugin-sdk";

const BASE_SQL = `SELECT "borough", "cases", "pop" FROM "nyc"`;

const EXISTING_COLUMN_NAMES = ["borough", "cases", "pop"];

const RATE_COLUMN: DerivedColumn = {
  name: "rate",
  expression: "{cases} * 100000.0 / NULLIF({population}, 0)",
  inputs: { cases: "cases", population: "pop" },
};

function _makeSqlFromColumns(
  columns: readonly DerivedColumn[],
  existingColumnNames: readonly string[] = EXISTING_COLUMN_NAMES,
): Readonly<{ sql: string; columnNames: readonly string[] }> {
  return makeDerivedColumnsSqlFromColumns({
    baseSql: BASE_SQL,
    existingColumnNames,
    columns,
  });
}

/**
 * The `PluginError` code `makeDerivedColumnsSqlFromColumns` throws for
 * `columns`, undefined when it does not throw.
 */
function _getThrownCode(
  columns: readonly DerivedColumn[],
  existingColumnNames: readonly string[] = EXISTING_COLUMN_NAMES,
): string | undefined {
  try {
    _makeSqlFromColumns(columns, existingColumnNames);
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

/**
 * The `PluginError` code thrown for `columns` of any shape, as plugin code
 * can pass at runtime. `Reflect.apply` passes it without a type cast.
 */
function _getThrownCodeFromUnknownColumns(
  columns: unknown,
): string | undefined {
  try {
    Reflect.apply(makeDerivedColumnsSqlFromColumns, undefined, [
      {
        baseSql: BASE_SQL,
        existingColumnNames: EXISTING_COLUMN_NAMES,
        columns,
      },
    ]);
    return undefined;
  } catch (error) {
    return error instanceof PluginError ? error.code : "not a PluginError";
  }
}

describe("makeDerivedColumnsSqlFromColumns", () => {
  it("wraps the base SQL and appends each column in order", () => {
    const { sql } = _makeSqlFromColumns([
      RATE_COLUMN,
      { name: "double_cases", expression: "{c} * 2", inputs: { c: "cases" } },
    ]);

    expect(sql).toBe(
      [
        "WITH ava_source AS (",
        "  SELECT *, row_number() OVER () AS __ava_row FROM (",
        `SELECT "borough", "cases", "pop" FROM "nyc"`,
        "  )",
        ")",
        "SELECT * EXCLUDE (__ava_row),",
        `  ("cases" * 100000.0 / NULLIF("pop", 0)) AS "rate",`,
        `  ("cases" * 2) AS "double_cases"`,
        "FROM ava_source",
        "ORDER BY __ava_row",
      ].join("\n"),
    );
  });

  it("quotes an input column whose name has spaces and a double quote", () => {
    const { sql } = _makeSqlFromColumns(
      [{ name: "doubled", expression: "{c} * 2", inputs: { c: 'case "n" 1' } }],
      ['case "n" 1'],
    );

    expect(sql).toContain(`  ("case ""n"" 1" * 2) AS "doubled"`);
  });

  it("drops a trailing semicolon and line comment from the base SQL", () => {
    const { sql } = makeDerivedColumnsSqlFromColumns({
      baseSql: `  SELECT * FROM "nyc"; -- every borough\n`,
      existingColumnNames: EXISTING_COLUMN_NAMES,
      columns: [RATE_COLUMN],
    });

    expect(sql).toContain(`FROM (\nSELECT * FROM "nyc"\n  )\n)`);
  });

  it("returns the added names in input order", () => {
    const { columnNames } = _makeSqlFromColumns([
      RATE_COLUMN,
      { name: "double_cases", expression: "{c} * 2", inputs: { c: "cases" } },
    ]);

    expect(columnNames).toEqual(["rate", "double_cases"]);
  });

  it("suffixes _2 to a name an existing column has in another case", () => {
    const { sql, columnNames } = _makeSqlFromColumns(
      [RATE_COLUMN],
      [...EXISTING_COLUMN_NAMES, "Rate"],
    );

    expect(columnNames).toEqual(["rate_2"]);
    expect(sql).toContain(`AS "rate_2"`);
  });

  it("suffixes _3 when the _2 name is taken too", () => {
    const { columnNames } = _makeSqlFromColumns(
      [RATE_COLUMN],
      [...EXISTING_COLUMN_NAMES, "rate", "rate_2"],
    );

    expect(columnNames).toEqual(["rate_3"]);
  });

  it("suffixes a name that an earlier added column took", () => {
    const { columnNames } = _makeSqlFromColumns([RATE_COLUMN, RATE_COLUMN]);

    expect(columnNames).toEqual(["rate", "rate_2"]);
  });

  it.each([
    ["an uppercase letter", "Rate"],
    ["a leading digit", "1rate"],
    ["a hyphen", "rate-x"],
    ["an empty string", ""],
  ])("rejects a name with %s", (_label, name) => {
    expect(_getThrownCode([{ ...RATE_COLUMN, name }])).toBe(
      "InvalidExpression",
    );
  });

  it("rejects a placeholder with no input", () => {
    expect(
      _getThrownCode([{ ...RATE_COLUMN, inputs: { cases: "cases" } }]),
    ).toBe("InvalidExpression");
  });

  it("rejects an input naming a column the result does not have", () => {
    expect(
      _getThrownCode([
        { ...RATE_COLUMN, inputs: { cases: "cases", population: "people" } },
      ]),
    ).toBe("InvalidExpression");
  });

  it("rejects a result that already has a column named __ava_row", () => {
    expect(
      _getThrownCode([RATE_COLUMN], [...EXISTING_COLUMN_NAMES, "__AVA_ROW"]),
    ).toBe("InvalidExpression");
  });

  it("quotes an input column named {x} without substituting it again", () => {
    const { sql } = _makeSqlFromColumns(
      [{ name: "doubled", expression: "{x} * 2", inputs: { x: "{x}" } }],
      ["{x}"],
    );

    expect(sql).toContain(`  ("{x}" * 2) AS "doubled"`);
  });

  it("rejects an empty column list", () => {
    expect(_getThrownCode([])).toBe("InvalidExpression");
  });

  it("rejects an expression that is not a single SQL expression", () => {
    expect(
      _getThrownCode([
        {
          name: "leak",
          expression: "{c} FROM secrets",
          inputs: { c: "cases" },
        },
      ]),
    ).toBe("InvalidExpression");
  });

  it.each([
    ["columns that are not an array", { name: "rate" }],
    ["columns that are undefined", undefined],
    ["a null entry", [null]],
    ["an entry that is a string", ["rate"]],
    [
      "a name that is not a string",
      [{ name: ["rate"], expression: "{c}", inputs: { c: "cases" } }],
    ],
    [
      "an expression that is not a string",
      [{ name: "rate", expression: 1, inputs: { c: "cases" } }],
    ],
    ["missing inputs", [{ name: "rate", expression: "{c}" }]],
    ["null inputs", [{ name: "rate", expression: "{c}", inputs: null }]],
    [
      "inputs that are a string",
      [{ name: "rate", expression: "1", inputs: "" }],
    ],
    [
      "inputs that are an array",
      [{ name: "rate", expression: "1", inputs: ["cases"] }],
    ],
    [
      "an input value that is not a string",
      [{ name: "rate", expression: "{c}", inputs: { c: 1 } }],
    ],
  ])("rejects %s with InvalidExpression", (_label, columns) => {
    expect(_getThrownCodeFromUnknownColumns(columns)).toBe("InvalidExpression");
  });
});
