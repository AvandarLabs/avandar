import { StructuredQueryTestFixtures } from "./StructuredQueryTestFixtures";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumnRead } from "$/models/queries/QueryColumn/QueryColumn.types";

const {
  propEq,
  sqlToStructuredQuery,
  makeFilterColumnFromStructuredQuery,
  structuredQueryToSql,
  withDuckDb,
  expect,
  it,
  _FIXTURE_SQL,
  _makeDataset,
  _makeColumn,
  _normalizeRow,
  _runQuery,
  _getParserDatasets,
} = StructuredQueryTestFixtures;

it("returns the same groups after a SQL/form round trip with an aggregate alias in HAVING", async () => {
  const originalSql = `
      SELECT district, SUM(cnt) AS total
      FROM cases
      WHERE cnt >= 2
      GROUP BY district
      HAVING total > 5
    `;
  const expectedRows = [{ district: "North", total: 7 }];
  await expect(_runQuery(originalSql)).resolves.toEqual(expectedRows);
  const mapped = sqlToStructuredQuery({
    sql: originalSql,
    datasets: [
      {
        dataset: _makeDataset("cases"),
        columns: [
          _makeColumn({ id: "district", name: "district" })
            .baseColumn as DatasetColumn.T,
          _makeColumn({ id: "cnt", name: "cnt", dataType: "bigint" })
            .baseColumn as DatasetColumn.T,
        ],
      },
    ],
  });
  expect(mapped.isFullyMapped).toBe(true);

  await expect(_runQuery(structuredQueryToSql(mapped.query))).resolves.toEqual(
    expectedRows,
  );
});

it.each([
  {
    sql: "SELECT district FROM cases WHERE cnt >= 5;",
    rows: [{ district: "North" }],
  },
  {
    sql: "SELECT district AS area FROM cases WHERE cnt >= 5 ORDER BY district;",
    rows: [{ area: "North" }],
  },
  {
    sql: "SELECT district, SUM(cnt) AS total, MAX(cnt) AS peak FROM cases WHERE cnt >= 2 GROUP BY district HAVING total > 5 AND peak >= 5;",
    rows: [{ district: "North", total: 7, peak: 5 }],
  },
  {
    sql: "SELECT district, COUNT(status) AS total FROM cases GROUP BY district HAVING total > 1;",
    rows: [{ district: "North", total: 2 }],
  },
])(
  "preserves rows and output names through SQL/form mapping: $sql",
  async ({ sql, rows }) => {
    const mapped = sqlToStructuredQuery({
      sql,
      datasets: _getParserDatasets(),
    });
    expect(mapped.isFullyMapped).toBe(true);
    await expect(_runQuery(sql)).resolves.toEqual(rows);
    await expect(
      _runQuery(structuredQueryToSql(mapped.query)),
    ).resolves.toEqual(rows);
  },
);

it.each([
  {
    sourceType: "boolean",
    values: "(true), (false)",
    threshold: 1,
    rows: [],
    resultType: "bigint",
  },
  {
    sourceType: "boolean",
    values: "(true), (false)",
    threshold: 0,
    rows: [{ total: 1 }],
    resultType: "bigint",
  },
  {
    sourceType: "bigint",
    values: "(2147483647::INTEGER), (1::INTEGER)",
    threshold: 2147483647,
    rows: [{ total: 2147483648 }],
    resultType: "bigint",
  },
  {
    sourceType: "double",
    values: "(0.75::DOUBLE), (0.5::DOUBLE)",
    threshold: 1,
    rows: [{ total: 1.25 }],
    resultType: "double",
  },
] as const)(
  "retains numeric HAVING on SUM($sourceType) above $threshold",
  async ({ sourceType, values, threshold, rows, resultType }) => {
    const sql = `SELECT SUM(flag) AS total FROM cases HAVING total > ${threshold}`;
    const mapped = sqlToStructuredQuery({
      sql,
      datasets: [
        {
          dataset: _makeDataset("cases"),
          columns: [
            _makeColumn({ id: "flag", name: "flag", dataType: sourceType })
              .baseColumn as DatasetColumn.T,
          ],
        },
      ],
    });
    expect(mapped.isFullyMapped).toBe(true);
    await withDuckDb(async (connection) => {
      await connection.run(
        `CREATE TABLE cases AS SELECT * FROM (VALUES ${values}) t(flag)`,
      );
      const original = await connection.runAndReadAll(sql);
      const emitted = await connection.runAndReadAll(
        structuredQueryToSql(mapped.query),
      );
      expect(original.getRowObjects().map(_normalizeRow)).toEqual(rows);
      expect(emitted.getRowObjects().map(_normalizeRow)).toEqual(rows);
    });
    const projection = mapped.query.queryColumns[0]!;
    expect(mapped.query.having.rules[0]).toMatchObject({
      columnDataType: resultType,
    });
    expect(
      makeFilterColumnFromStructuredQuery({
        query: mapped.query,
        columnId: projection.id,
        clause: "having",
      })?.dataType,
    ).toBe(resultType);
  },
);

it("retains WHERE input and independent HAVING projections after alias and source renames", async () => {
  const sql =
    "SELECT district, SUM(cnt) AS total, MAX(cnt) AS peak FROM cases WHERE cnt >= 2 GROUP BY district HAVING total > 5 AND peak >= 5;";
  const mapped = sqlToStructuredQuery({
    sql,
    datasets: _getParserDatasets(),
  });
  const total = mapped.query.queryColumns.find(propEq("outputAlias", "total"));
  expect(total).toBeDefined();
  const aliased = {
    ...mapped.query,
    queryColumns: mapped.query.queryColumns.map((column) => {
      return column.id === total?.id
        ? { ...column, outputAlias: "amount" }
        : column;
    }),
  };
  await expect(_runQuery(structuredQueryToSql(aliased))).resolves.toEqual([
    { district: "North", amount: 7, peak: 5 },
  ]);
  const reparsed = sqlToStructuredQuery({
    sql: sql.replaceAll("total", "amount"),
    datasets: _getParserDatasets(),
    previousQuery: mapped.query,
    sourceColumns: mapped.query.sourceColumns,
  });
  expect(
    reparsed.query.queryColumns.find(propEq("outputAlias", "amount"))?.id,
  ).toBe(total?.id);
  const rename = (column: QueryColumnRead): QueryColumnRead => {
    return column.baseColumn.name === "cnt"
      ? {
          ...column,
          baseColumn: { ...column.baseColumn, name: "count_value" },
        }
      : column;
  };
  const renamed = {
    ...aliased,
    sourceColumns: aliased.sourceColumns?.map(rename),
    queryColumns: aliased.queryColumns.map(rename),
  };
  await withDuckDb(async (connection) => {
    await connection.run(_FIXTURE_SQL);
    await connection.run("ALTER TABLE cases RENAME COLUMN cnt TO count_value");
    const result = await connection.runAndReadAll(
      structuredQueryToSql(renamed),
    );
    expect(result.getRowObjects().map(_normalizeRow)).toEqual([
      { district: "North", amount: 7, peak: 5 },
    ]);
  });
});
