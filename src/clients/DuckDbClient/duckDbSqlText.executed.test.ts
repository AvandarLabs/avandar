import { describe, expect, it } from "vitest";
import { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";
import {
  getParquetProjectionClauses,
  getQueryStringFromParams,
} from "@/clients/DuckDbClient/duckDbSqlText";
import { withDuckDb } from "../../../tests/integration/queries/executedDuckDb";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DuckDbLoadParquetOptions } from "@/clients/DuckDbClient/duckDbClientOperations";
import type { DuckDBConnection } from "@duckdb/node-api";

/** Stored rows, as a dataset's Parquet file holds them. */
const RAW_ROWS_SQL = `CREATE TABLE raw AS SELECT * FROM (VALUES
  (1, '1', 'Male', 1, '01', 1),
  (2, ' 2 ', ' f ', 4, '2', 2),
  (3, '9', 'man', 2, '9', 3),
  (4, '7', 'Mle', 7, 'x', 4),
  (5, NULL, NULL, NULL, NULL, 5),
  (6, 'm', 'Unknown', 99, '1', 6),
  (7, '1', 'F', 3, '2', 7)
) AS t(case_id, "GENDER", sex_label, "SES", code_text, hostile)`;

/** The view statement `loadParquetIntoDuckDb` runs, over the table above. */
const VIEW_TEMPLATE = `CREATE VIEW "$tableName$" AS SELECT * $excludeClause$ $replaceClause$ FROM raw`;

function _pair(code: string, label: string, acceptedSpellings: string[] = []) {
  return { code, label, acceptedSpellings, isMissing: false };
}

const SEX_PAIRS: DataDictionaryCodeList.Pair[] = [
  _pair("1", "Male", ["M", "man"]),
  _pair("2", "Female", ["F"]),
  _pair("9", "Unknown"),
];

const HOSTILE_LABELS = [
  "O'Brien",
  "$& and $` and $' and $$",
  'say "hi"',
  "x' ) ; DROP TABLE raw; --",
  "two\nlines",
  "$excludeClause$",
];

function _conversion(
  overrides: Partial<ColumnConversion.T>,
): ColumnConversion.T {
  return {
    datasetColumnId: "col",
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

const SES_CONVERSION = _conversion({
  pairs: [
    _pair("1", "Low"),
    _pair("2", "Lower-middle"),
    _pair("3", "Upper-middle"),
    _pair("4", "High"),
    _pair("9", "Unknown"),
    _pair("99", "Unknown"),
  ],
  isOrdered: true,
});

const REPLACEMENTS: NonNullable<
  DuckDbLoadParquetOptions["columnReplacements"]
> = {
  GENDER: {
    valueMapping: _conversion({
      keepsOriginalAs: "GENDER_original",
      overrides: [
        { value: "7", action: "empty" },
        { value: "m", action: "map", code: "2" },
      ],
    }),
  },
  sex_label: {
    alias: "sex",
    valueMapping: _conversion({
      direction: "encode",
      outputDataType: "bigint",
    }),
  },
  SES: { valueMapping: SES_CONVERSION },
  code_text: {
    dataType: "BIGINT",
    originalCopyDataType: "BIGINT",
    valueMapping: _conversion({ keepsOriginalAs: "code_text_original" }),
  },
  hostile: {
    valueMapping: _conversion({
      pairs: HOSTILE_LABELS.map((label, index) => {
        return _pair(String(index + 1), label);
      }),
    }),
  },
};

async function _readAll(
  connection: DuckDBConnection,
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  return (await connection.runAndReadAll(sql)).getRowObjects();
}

/** Builds the converted view the way a load does, then reads `sql` from it. */
async function _readConverted(
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    await _readAll(connection, RAW_ROWS_SQL);
    const keptRows = await _readAll(
      connection,
      ColumnConversion.toKeptValuesSql({
        relationSql: '"raw"',
        valueSql: '"SES"',
        conversion: SES_CONVERSION,
      }),
    );
    const keptValues = keptRows.map((row) => {
      return String(row.kept_value);
    });
    const clauses = getParquetProjectionClauses(REPLACEMENTS, {
      keptValuesByColumn: { SES: keptValues },
    });
    await _readAll(
      connection,
      getQueryStringFromParams({
        queryString: VIEW_TEMPLATE,
        params: { tableName: "converted", ...clauses },
      }),
    );
    return await _readAll(connection, sql);
  });
}

describe("getParquetProjectionClauses, executed", () => {
  it("decodes codes, applies overrides, and keeps the original values beside them", async () => {
    const rows = await _readConverted(
      `SELECT "GENDER", "GENDER_original" FROM converted ORDER BY case_id`,
    );

    expect(rows).toEqual([
      { GENDER: "Male", GENDER_original: "1" },
      { GENDER: "Female", GENDER_original: " 2 " },
      { GENDER: "Unknown", GENDER_original: "9" },
      { GENDER: null, GENDER_original: "7" },
      { GENDER: null, GENDER_original: null },
      { GENDER: "Female", GENDER_original: "m" },
      { GENDER: "Male", GENDER_original: "1" },
    ]);
  });

  it("encodes labels and accepted spellings to BIGINT codes, emptying a value that is not a number", async () => {
    const rows = await _readConverted(
      `SELECT sex FROM converted ORDER BY case_id`,
    );

    expect(
      rows.map((row) => {
        return row.sex;
      }),
    ).toEqual([1n, 2n, 1n, null, null, 9n, 2n]);
  });

  it("encodes to BIGINT, emptying a kept value that is not a whole number and casting one that is", async () => {
    const rows = await withDuckDb(async (connection) => {
      const codeSql = ColumnConversion.toCaseSql({
        valueSql: '"sex"',
        conversion: _conversion({
          direction: "encode",
          outputDataType: "bigint",
        }),
      });
      return await _readAll(
        connection,
        `SELECT ${codeSql} AS code FROM (VALUES ('Male'), ('Other'), (' 7 ')) AS t(sex)`,
      );
    });

    expect(rows).toEqual([{ code: 1n }, { code: null }, { code: 7n }]);
  });

  it("converts the value the column had before converting", async () => {
    const rows = await _readConverted(
      `SELECT code_text FROM converted ORDER BY case_id`,
    );

    expect(
      rows.map((row) => {
        return row.code_text;
      }),
    ).toEqual(["Male", "Female", "Unknown", null, null, "Male", "Female"]);
  });

  it("keeps a BIGINT copy of a text column cast to BIGINT before converting", async () => {
    const rows = await _readConverted(
      `SELECT code_text_original, typeof(code_text_original) AS copy_type FROM converted ORDER BY case_id`,
    );

    expect(rows).toEqual([
      { code_text_original: 1n, copy_type: "BIGINT" },
      { code_text_original: 2n, copy_type: "BIGINT" },
      { code_text_original: 9n, copy_type: "BIGINT" },
      { code_text_original: null, copy_type: "BIGINT" },
      { code_text_original: null, copy_type: "BIGINT" },
      { code_text_original: 1n, copy_type: "BIGINT" },
      { code_text_original: 2n, copy_type: "BIGINT" },
    ]);
  });

  it("types an integer-coded column as BIGINT and an ordered one as an ENUM with its kept values", async () => {
    const rows = await _readConverted(
      `SELECT column_name, column_type FROM (DESCRIBE converted) WHERE column_name IN ('sex', 'SES')`,
    );

    expect(rows).toEqual([
      { column_name: "sex", column_type: "BIGINT" },
      {
        column_name: "SES",
        column_type:
          "ENUM('Low', 'Lower-middle', 'Upper-middle', 'High', 'Unknown', '7')",
      },
    ]);
  });

  it("sorts an ordered list in list order, its kept values after", async () => {
    const rows = await _readConverted(
      `SELECT "SES" AS level, count(*)::INTEGER AS n FROM converted GROUP BY 1 ORDER BY 1`,
    );

    expect(rows).toEqual([
      { level: "Low", n: 1 },
      { level: "Lower-middle", n: 1 },
      { level: "Upper-middle", n: 1 },
      { level: "High", n: 1 },
      { level: "Unknown", n: 1 },
      { level: "7", n: 1 },
      { level: null, n: 1 },
    ]);
  });

  it("filters an ordered column by label and by a label it does not hold, without an error", async () => {
    const rows = await _readConverted(
      `SELECT count(*) FILTER (WHERE "SES" = 'Low')::INTEGER AS low, count(*) FILTER (WHERE "SES" = 'Bogus')::INTEGER AS bogus FROM converted`,
    );

    expect(rows).toEqual([{ low: 1, bogus: 0 }]);
  });

  it("keeps hostile labels as data, through the view template", async () => {
    const rows = await _readConverted(
      `SELECT hostile FROM converted ORDER BY case_id`,
    );

    expect(
      rows.map((row) => {
        return row.hostile;
      }),
    ).toEqual([...HOSTILE_LABELS, "7"]);
  });
});

/**
 * Builds a view converting `levels_sql`'s `level` column with an ordered
 * list, reading its kept values first as a load does, then reads `sql`.
 */
async function _readOrderedLevels(
  levelsSql: string,
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    await _readAll(connection, `CREATE TABLE levels AS ${levelsSql}`);
    const keptRows = await _readAll(
      connection,
      ColumnConversion.toKeptValuesSql({
        relationSql: '"levels"',
        valueSql: '"level"',
        conversion: SES_CONVERSION,
      }),
    );
    const clauses = getParquetProjectionClauses(
      { level: { valueMapping: SES_CONVERSION } },
      {
        keptValuesByColumn: {
          level: keptRows.map((row) => {
            return String(row.kept_value);
          }),
        },
      },
    );
    await _readAll(
      connection,
      `CREATE VIEW converted AS SELECT * ${clauses.excludeClause} ${clauses.replaceClause} FROM levels`,
    );
    return await _readAll(connection, sql);
  });
}

describe("ordered conversions an ENUM cannot hold, executed", () => {
  it("reads a kept value holding a NUL character as text", async () => {
    const rows = await _readOrderedLevels(
      `SELECT * FROM (VALUES ('1'), ('a' || chr(0) || 'b')) AS t(level)`,
      `SELECT level, typeof(level) AS level_type FROM converted ORDER BY level`,
    );

    expect(rows).toEqual([
      { level: "Low", level_type: "VARCHAR" },
      { level: `a${String.fromCharCode(0)}b`, level_type: "VARCHAR" },
    ]);
  });

  it("reads a column with more than 1,000 kept values as text", async () => {
    const rows = await _readOrderedLevels(
      `SELECT CAST(range + 100 AS VARCHAR) AS level FROM range(1001)`,
      `SELECT count(DISTINCT level)::INTEGER AS levels, any_value(typeof(level)) AS level_type FROM converted`,
    );

    expect(rows).toEqual([{ levels: 1001, level_type: "VARCHAR" }]);
  });

  it("keeps an ENUM for exactly 1,000 kept values", async () => {
    const rows = await _readOrderedLevels(
      `SELECT CAST(range + 100 AS VARCHAR) AS level FROM range(1000)`,
      `SELECT any_value(typeof(level)) AS level_type FROM converted`,
    );

    expect(String(rows[0]?.level_type)).toMatch(/^ENUM\(/);
  });
});
