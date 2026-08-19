import { EMPTY_QUERY_FILTER } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";
import { applyHaving } from "$/models/queries/StructuredQuery/structuredQueryToSql/applyHaving/applyHaving.ts";
import { sqlBuilder } from "$/models/queries/StructuredQuery/structuredQueryToSql/sqlBuilder.ts";
import { describe, expect, it } from "vitest";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types.ts";

function _having(group: QueryFilterGroup): string {
  const builder = sqlBuilder.queryBuilder().select("*").from("t").groupBy("g");
  return applyHaving(builder, group).toQuery();
}

describe("applyHaving", () => {
  it("omits HAVING for an empty group", () => {
    expect(_having(EMPTY_QUERY_FILTER).toLowerCase()).not.toContain("having");
  });

  it("renders the same predicate shape as WHERE does", () => {
    const sql = _having({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "total",
          columnDataType: "bigint",
          operator: ">",
          value: 1000,
        },
      ],
    });
    expect(sql).toContain('having "total" > 1000');
  });

  it("renders text matching with the substring function form", () => {
    const sql = _having({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "label",
          columnDataType: "varchar",
          operator: "contains",
          value: "san",
        },
      ],
    });
    expect(sql).toContain(`contains(lower("label"), lower('san'))`);
  });

  it("skips incomplete rules", () => {
    const sql = _having({
      type: "group",
      combinator: "AND",
      rules: [
        {
          type: "rule",
          columnName: "total",
          columnDataType: "bigint",
          operator: ">",
          value: "",
        },
      ],
    });
    expect(sql.toLowerCase()).not.toContain("having");
  });
});
