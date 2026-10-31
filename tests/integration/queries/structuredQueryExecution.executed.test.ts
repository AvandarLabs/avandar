import { StructuredQueryTestFixtures } from "./StructuredQueryTestFixtures";
import type { PartialStructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery.types";

const {
  structuredQueryToSql,
  expect,
  it,
  _makeDataset,
  _makeColumn,
  _makeQuery,
  _runQuery,
} = StructuredQueryTestFixtures;

it("filters and groups to the right rows", async () => {
  const status = _makeColumn({ id: "qc_status", name: "status" });
  const district = _makeColumn({ id: "qc_1_district", name: "district" });
  const total = _makeColumn({
    id: "qc_2_cnt",
    name: "cnt",
    dataType: "bigint",
    aggregation: "sum",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeDataset("cases"),
      columns: [district, total],
      sourceColumns: [district, total, status],
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnId: status.id,
            operator: "=",
            value: "confirmed",
          },
        ],
      },
      orderByColumn: district.id,
      orderByDirection: "asc",
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { district: "East", "sum(cnt)": 1 },
    { district: "North", "sum(cnt)": 5 },
    { district: "South", "sum(cnt)": 3 },
  ]);
});

it("keeps unmatched left rows on a left join", async () => {
  const label = _makeColumn({ id: "qc_1_label", name: "district_label" });
  const population = _makeColumn({
    id: "qc_2_population",
    name: "population",
    dataType: "bigint",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeDataset("districts"),
      columns: [label, population],
      joins: [
        {
          id: "j1",
          kind: "left",
          target: { type: "table", tableName: "populations" },
          on: [
            {
              type: "equality",
              leftColumn: "district_key",
              rightColumn: "pop_key",
            },
          ],
        },
      ],
      orderByColumn: label.id,
      orderByDirection: "asc",
    }),
  );

  // "West" has no row in `populations`; a left join must keep it with a
  // NULL population, which DuckDB hands back as `null`. An inner join
  // would silently drop the row.
  await expect(_runQuery(sql)).resolves.toEqual([
    { district_label: "North", population: 100 },
    { district_label: "South", population: 50 },
    { district_label: "West", population: null },
  ]);
});

it("orders and limits to the top rows in order", async () => {
  const district = _makeColumn({ id: "qc_1_district", name: "district" });
  const cnt = _makeColumn({
    id: "qc_2_cnt",
    name: "cnt",
    dataType: "bigint",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeDataset("cases"),
      columns: [district, cnt],
      orderByColumn: cnt.id,
      orderByDirection: "desc",
      limit: 2,
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { district: "North", cnt: 5 },
    { district: "South", cnt: 3 },
  ]);
});

it("filters after aggregation with a having clause", async () => {
  const district = _makeColumn({ id: "qc_1_district", name: "district" });
  const total = _makeColumn({
    id: "qc_2_cnt",
    name: "cnt",
    dataType: "bigint",
    aggregation: "sum",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeDataset("cases"),
      columns: [district, total],
      having: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            // The HAVING tree names the *derived* column, which is the
            // alias `structuredQueryToSql` emits for a sum.
            columnId: total.id,
            operator: ">",
            value: 3,
          },
        ],
      },
      orderByColumn: district.id,
      orderByDirection: "asc",
    }),
  );

  // North sums to 7, South to 3, East to 1, so only North survives.
  await expect(_runQuery(sql)).resolves.toEqual([
    { district: "North", "sum(cnt)": 7 },
  ]);
});

it("orders by an aggregation carried only by the aggregations map", async () => {
  // The two copies of a column's aggregation, the query's `aggregations`
  // map and the column's own `aggregation` field, are maintained
  // independently. Here only the map carries the sum, which is what used to
  // make the emitter alias `sum(cnt)` in the SELECT list while naming the
  // bare `cnt` in the ORDER BY: a column that is neither grouped nor
  // aggregated, which DuckDB rejects outright. Executing the SQL is the
  // assertion that matters; a string comparison passed the broken version.
  const district = _makeColumn({ id: "qc_1_district", name: "district" });
  const total = _makeColumn({
    id: "qc_2_cnt",
    name: "cnt",
    dataType: "bigint",
  });

  const query = _makeQuery({
    dataSource: _makeDataset("cases"),
    columns: [district, total],
    orderByColumn: total.id,
    orderByDirection: "desc",
  });
  const withMapOnlyAggregation = {
    ...query,
    aggregations: { ...query.aggregations, [total.id]: "sum" },
  } as PartialStructuredQuery;

  const sql = structuredQueryToSql(withMapOnlyAggregation);
  // North sums to 7, South to 3 and East to 1, so a descending sort on the
  // aggregate is a different order from a descending sort on `cnt`, whose
  // largest single row is North's 5.
  await expect(_runQuery(sql)).resolves.toEqual([
    { district: "North", "sum(cnt)": 7 },
    { district: "South", "sum(cnt)": 3 },
    { district: "East", "sum(cnt)": 1 },
  ]);
});

it("orders by the bare column when only the column field carries the aggregation", async () => {
  // The other direction of the same disagreement, and the reason the map is
  // the emitter's source of truth rather than the column: the map says
  // `none`, so no aggregate is emitted and no GROUP BY is either. An ORDER
  // BY taken from the column's field would name `sum(cnt)`, an alias that
  // appears nowhere in the statement.
  const district = _makeColumn({ id: "qc_1_district", name: "district" });
  const total = _makeColumn({
    id: "qc_2_cnt",
    name: "cnt",
    dataType: "bigint",
    aggregation: "sum",
  });

  const query = _makeQuery({
    dataSource: _makeDataset("cases"),
    columns: [district, total],
    orderByColumn: total.id,
    orderByDirection: "desc",
  });
  const withColumnOnlyAggregation = {
    ...query,
    aggregations: { ...query.aggregations, [total.id]: "none" },
  } as PartialStructuredQuery;

  const sql = structuredQueryToSql(withColumnOnlyAggregation);
  await expect(_runQuery(sql)).resolves.toEqual([
    { district: "North", cnt: 5 },
    { district: "South", cnt: 3 },
    { district: "North", cnt: 2 },
    { district: "East", cnt: 1 },
  ]);
});

it("orders by the bare column when the map has no entry for it", async () => {
  // A column absent from the map is not aggregated, because the aggregate
  // pass only walks the map's entries. Falling back to the column's own
  // field for a missing key would name an alias no SELECT item emits, so
  // absent and `none` have to behave the same way.
  const district = _makeColumn({ id: "qc_1_district", name: "district" });
  const total = _makeColumn({
    id: "qc_2_cnt",
    name: "cnt",
    dataType: "bigint",
    aggregation: "sum",
  });

  const query = _makeQuery({
    dataSource: _makeDataset("cases"),
    columns: [district, total],
    orderByColumn: total.id,
    orderByDirection: "desc",
  });
  const { [total.id]: _dropped, ...aggregationsWithoutTotal } =
    query.aggregations;
  const withNoAggregationEntry = {
    ...query,
    aggregations: aggregationsWithoutTotal,
  } as PartialStructuredQuery;

  const sql = structuredQueryToSql(withNoAggregationEntry);
  await expect(_runQuery(sql)).resolves.toEqual([
    { district: "North", cnt: 5 },
    { district: "South", cnt: 3 },
    { district: "North", cnt: 2 },
    { district: "East", cnt: 1 },
  ]);
});
