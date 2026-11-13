import { describe, expect, it } from "vitest";
import {
  getParquetProjectionClauses,
  getQueryStringFromParams,
} from "@/clients/DuckDbClient/duckDbSqlText";
import type { ColumnConversion } from "$/models/dataDictionaries/ColumnConversion/ColumnConversion";

describe("getQueryStringFromParams", () => {
  it("substitutes every placeholder of each parameter", () => {
    expect(
      getQueryStringFromParams({
        queryString: `CREATE VIEW "$tableName$" AS SELECT * FROM read_parquet("$tableName$")`,
        params: { tableName: "t1" },
      }),
    ).toBe(`CREATE VIEW "t1" AS SELECT * FROM read_parquet("t1")`);
  });

  it("inserts dollar patterns in a value literally", () => {
    expect(
      getQueryStringFromParams({
        queryString: "SELECT * $replaceClause$ FROM t",
        params: { replaceClause: ", 'US$$ $& $` $'' x' AS \"label\"" },
      }),
    ).toBe("SELECT * , 'US$$ $& $` $'' x' AS \"label\" FROM t");
  });

  it("never substitutes a placeholder that appears inside a value", () => {
    expect(
      getQueryStringFromParams({
        queryString: "SELECT * $excludeClause$ $replaceClause$ FROM t",
        params: {
          replaceClause: ", '$excludeClause$' AS \"label\"",
          excludeClause: 'EXCLUDE ("x")',
        },
      }),
    ).toBe(`SELECT * EXCLUDE ("x") , '$excludeClause$' AS "label" FROM t`);
  });

  it("leaves a placeholder with no parameter, or an undefined one, as it is", () => {
    expect(
      getQueryStringFromParams({
        queryString: "SELECT $q$'$q$, $limit$, $name$",
        params: { limit: undefined, name: 3n },
      }),
    ).toBe("SELECT $q$'$q$, $limit$, 3");
  });
});

/** A decode conversion of GENDER, which keeps a `GENDER_original` copy. */
const GENDER_CONVERSION: ColumnConversion.T = {
  datasetColumnId: "col-gender",
  direction: "decode",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
  ],
  isOrdered: false,
  overrides: [],
  keepsOriginalAs: "GENDER_original",
  outputDataType: "varchar",
  inputDataType: "bigint",
};

const GENDER_CASE_SQL = `CASE lower(trim(CAST(TRY_CAST("GENDER" AS BIGINT) AS VARCHAR))) WHEN lower(trim('1')) THEN 'Male' ELSE CAST(TRY_CAST("GENDER" AS BIGINT) AS VARCHAR) END`;

describe("getParquetProjectionClauses", () => {
  it("renames and casts as before, quoting each name", () => {
    expect(
      getParquetProjectionClauses({
        zip: { alias: 'zip "code"', dataType: "VARCHAR" },
      }),
    ).toEqual({
      excludeClause: 'EXCLUDE ("zip")',
      replaceClause: ', TRY_CAST("zip" AS VARCHAR) AS "zip ""code"""',
    });
  });

  it("selects a converted column as its conversion, then its keep-original copy", () => {
    const { excludeClause, replaceClause } = getParquetProjectionClauses({
      GENDER: { dataType: "BIGINT", valueMapping: GENDER_CONVERSION },
    });

    expect(excludeClause).toBe('EXCLUDE ("GENDER")');
    expect(replaceClause).toBe(
      `, ${GENDER_CASE_SQL} AS "GENDER", "GENDER" AS "GENDER_original"`,
    );
  });

  it("casts the keep-original copy to its own stored type", () => {
    const { replaceClause } = getParquetProjectionClauses({
      GENDER: {
        dataType: "BIGINT",
        originalCopyDataType: "BIGINT",
        valueMapping: GENDER_CONVERSION,
      },
    });

    expect(replaceClause).toBe(
      `, ${GENDER_CASE_SQL} AS "GENDER", TRY_CAST("GENDER" AS BIGINT) AS "GENDER_original"`,
    );
  });

  it("names a renamed converted column by its alias", () => {
    const { replaceClause } = getParquetProjectionClauses({
      GENDER: {
        alias: "sex",
        valueMapping: { ...GENDER_CONVERSION, keepsOriginalAs: undefined },
      },
    });

    expect(replaceClause.endsWith(' END AS "sex"')).toBe(true);
  });

  it("leaves conversions and copies out of the raw-values view", () => {
    expect(
      getParquetProjectionClauses(
        { GENDER: { dataType: "BIGINT", valueMapping: GENDER_CONVERSION } },
        { omitsValueMappings: true },
      ),
    ).toEqual({
      excludeClause: 'EXCLUDE ("GENDER")',
      replaceClause: ', TRY_CAST("GENDER" AS BIGINT) AS "GENDER"',
    });
  });

  it("completes an ordered column's ENUM with the kept values for its original name", () => {
    const { replaceClause } = getParquetProjectionClauses(
      {
        SES: {
          valueMapping: {
            ...GENDER_CONVERSION,
            isOrdered: true,
            keepsOriginalAs: undefined,
            inputDataType: undefined,
          },
        },
      },
      { keptValuesByColumn: { SES: ["7"] } },
    );

    expect(replaceClause).toContain("AS ENUM('Male', '7')) AS \"SES\"");
  });

  it("returns empty clauses when nothing is replaced", () => {
    expect(getParquetProjectionClauses(undefined)).toEqual({
      excludeClause: "",
      replaceClause: "",
    });
  });
});
