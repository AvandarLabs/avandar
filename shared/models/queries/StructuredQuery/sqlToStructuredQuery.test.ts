import { sqlToStructuredQuery } from "$/models/queries/StructuredQuery/sqlToStructuredQuery.ts";
import { describe, expect, it } from "vitest";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";

const datasetId = "dataset_users";

function _makeDataset(): DatasetModel["Read"] {
  return {
    __type: "Dataset",
    id: datasetId,
    name: "users",
  } as unknown as DatasetModel["Read"];
}

function _column(name: string, dataType = "varchar"): DatasetColumnRead {
  return {
    __type: "DatasetColumn",
    id: `col_${name}`,
    name,
    originalName: name,
    dataType,
    columnIdx: 0,
  } as unknown as DatasetColumnRead;
}

const datasets = [
  {
    dataset: _makeDataset(),
    columns: [
      _column("name"),
      _column("age", "integer"),
      _column("status"),
      _column("created_at", "timestamp"),
    ],
  },
];

describe("sqlToStructuredQuery", () => {
  it("maps a simple SELECT with no WHERE", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name", "age" FROM "${datasetId}"`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    expect(result.query.dataSource?.id).toBe(datasetId);
    const colNames = result.query.queryColumns.map((c) => {
      return c.baseColumn.name;
    });
    expect(colNames).toEqual(["name", "age"]);
  });

  it("expands SELECT * into all dataset columns", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT * FROM "${datasetId}"`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    expect(result.query.queryColumns.length).toBe(4);
  });

  it("captures aggregations from SELECT", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name", SUM("age") FROM "${datasetId}" GROUP BY "name"`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    const ageColumn = result.query.queryColumns.find((c) => {
      return c.baseColumn.name === "age";
    });
    expect(ageColumn).toBeDefined();
    expect(ageColumn && result.query.aggregations[ageColumn.id]).toBe("sum");
    const nameColumn = result.query.queryColumns.find((c) => {
      return c.baseColumn.name === "name";
    });
    expect(nameColumn && result.query.aggregations[nameColumn.id]).toBe(
      "group_by",
    );
  });

  it("maps a simple WHERE clause into a filter group", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name" FROM "${datasetId}" WHERE "age" > 30`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    expect(result.query.filters.type).toBe("group");
    expect(result.query.filters.rules.length).toBe(1);
    const rule = result.query.filters.rules[0];
    expect(rule?.type).toBe("rule");
    if (rule && rule.type === "rule") {
      expect(rule.columnName).toBe("age");
      expect(rule.operator).toBe(">");
      expect(rule.value).toBe(30);
    }
  });

  it("maps nested AND/OR groups", () => {
    const result = sqlToStructuredQuery({
      sql:
        `SELECT "name" FROM "${datasetId}" ` +
        `WHERE ("age" > 30 AND "status" = 'active') OR "name" = 'admin'`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    expect(result.query.filters.combinator).toBe("OR");
    expect(result.query.filters.rules.length).toBe(2);
    const firstNode = result.query.filters.rules[0];
    expect(firstNode?.type).toBe("group");
    if (firstNode && firstNode.type === "group") {
      expect(firstNode.combinator).toBe("AND");
      expect(firstNode.rules.length).toBe(2);
    }
  });

  it("maps ORDER BY single column with direction", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name", "age" FROM "${datasetId}" ORDER BY "age" DESC`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    expect(result.query.orderByDirection).toBe("desc");
  });

  it("maps LIMIT and OFFSET", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name" FROM "${datasetId}" LIMIT 10 OFFSET 5`,
      datasets,
    });
    expect(result.query.limit).toBe(10);
    expect(result.query.offset).toBe(5);
  });

  it("flags comma-joined FROM as partial", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT a.name FROM "${datasetId}" a, other_table b`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(false);
    expect(
      result.unmappedReasons.some((r) => {
        return r.toLowerCase().includes("comma");
      }),
    ).toBe(true);
  });

  it("returns isFullyMapped=false when SQL is unparseable", () => {
    const result = sqlToStructuredQuery({
      sql: "NOT VALID SQL %",
      datasets,
    });
    expect(result.isFullyMapped).toBe(false);
    expect(result.unmappedReasons.length).toBeGreaterThan(0);
  });

  it("flags CTE / DISTINCT as partial mappings", () => {
    const distinctResult = sqlToStructuredQuery({
      sql: `SELECT DISTINCT "name" FROM "${datasetId}"`,
      datasets,
    });
    expect(distinctResult.isFullyMapped).toBe(false);
    expect(
      distinctResult.unmappedReasons.some((r) => {
        return r.toUpperCase().includes("DISTINCT");
      }),
    ).toBe(true);
  });

  it("returns empty filters when WHERE is absent", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name" FROM "${datasetId}"`,
      datasets,
    });
    expect(result.query.filters.rules.length).toBe(0);
  });

  it("maps IN list to in operator", () => {
    const result = sqlToStructuredQuery({
      sql: `SELECT "name" FROM "${datasetId}" WHERE "status" IN ('active', 'pending')`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(true);
    const rule = result.query.filters.rules[0];
    expect(rule?.type).toBe("rule");
    if (rule && rule.type === "rule") {
      expect(rule.operator).toBe("in");
      expect(rule.value).toEqual(["active", "pending"]);
    }
  });

  it("maps HAVING clause into the having filter group", () => {
    const result = sqlToStructuredQuery({
      sql:
        `SELECT "name", count("age") FROM "${datasetId}" ` +
        `GROUP BY "name" HAVING count("age") > 1`,
      datasets,
    });
    expect(result.query.having.rules.length).toBe(1);
    const rule = result.query.having.rules[0];
    expect(rule?.type).toBe("rule");
    if (rule && rule.type === "rule") {
      expect(rule.columnName).toBe("count(age)");
      expect(rule.operator).toBe(">");
      expect(rule.value).toBe(1);
    }
  });

  it("maps an INNER JOIN into the joins array", () => {
    const result = sqlToStructuredQuery({
      sql:
        `SELECT a.name, b.email FROM "${datasetId}" a ` +
        `INNER JOIN profiles b ON a.id = b.user_id`,
      datasets,
    });
    expect(result.query.joins.length).toBe(1);
    const join = result.query.joins[0];
    expect(join?.kind).toBe("inner");
    expect(join?.target.type).toBe("table");
    if (join && join.target.type === "table") {
      expect(join.target.tableName).toBe("profiles");
      expect(join.target.alias).toBe("b");
    }
    expect(join?.on.length).toBe(1);
    expect(join?.on[0]?.leftColumn).toBe("id");
    expect(join?.on[0]?.rightColumn).toBe("user_id");
  });

  it("maps LEFT JOIN with subquery target", () => {
    const result = sqlToStructuredQuery({
      sql:
        `SELECT a.name FROM "${datasetId}" a ` +
        `LEFT JOIN (SELECT user_id, MAX(score) AS s FROM scores ` +
        `GROUP BY user_id) sub ON a.id = sub.user_id`,
      datasets,
    });
    expect(result.query.joins.length).toBe(1);
    const join = result.query.joins[0];
    expect(join?.kind).toBe("left");
    expect(join?.target.type).toBe("subquery");
    if (join && join.target.type === "subquery") {
      expect(join.target.alias).toBe("sub");
    }
  });

  it("captures a nested subquery in FROM into nestedSubquery", () => {
    const result = sqlToStructuredQuery({
      sql:
        `SELECT * FROM (SELECT "name", "age" FROM "${datasetId}" ` +
        `WHERE "age" > 18) AS adult`,
      datasets,
    });
    expect(result.query.nestedSubquery).toBeDefined();
    if (result.query.nestedSubquery) {
      expect(result.query.nestedSubquery.alias).toBe("adult");
      expect(result.query.nestedSubquery.sql.length).toBeGreaterThan(0);
    }
  });

  it("flags non-equality JOIN ON as partial", () => {
    const result = sqlToStructuredQuery({
      sql:
        `SELECT a.name FROM "${datasetId}" a ` +
        `INNER JOIN profiles b ON a.id > b.user_id`,
      datasets,
    });
    expect(result.isFullyMapped).toBe(false);
    expect(
      result.unmappedReasons.some((r) => {
        return r.toLowerCase().includes("equality");
      }),
    ).toBe(true);
  });
});
