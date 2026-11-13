import { describe, expect, it } from "vitest";
import { getQueryStringFromParams } from "@/clients/DuckDbClient/duckDbSqlText";

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
