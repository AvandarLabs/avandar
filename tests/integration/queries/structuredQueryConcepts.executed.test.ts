import { StructuredQueryTestFixtures } from "./StructuredQueryTestFixtures";

const {
  structuredQueryToSql,
  expect,
  it,
  _makeConcept,
  _makeConceptAttributeColumn,
  _makeConceptStatusColumn,
  _makeQuery,
  _runQuery,
} = StructuredQueryTestFixtures;

it("selects from a Concept source through its prefixed table name", async () => {
  // This used to throw outright. The rows come back only if the FROM names
  // `concept_<uuid>`, because that is the only name the fixture created:
  // `_CONCEPT_ID` alone is not a table here, so a bare id would fail to bind.
  const externalId = _makeConceptAttributeColumn({
    id: "qc_1_external_id",
    name: "external_id",
  });
  const region = _makeConceptAttributeColumn({
    id: "qc_2_region",
    name: "region",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [externalId, region],
      orderByColumn: externalId.id,
      orderByDirection: "asc",
      limit: 2,
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { external_id: "p1", region: "North" },
    { external_id: "p2", region: "North" },
  ]);
});

it("groups and aggregates a Concept's attributes", async () => {
  // The regression guard for the aggregation gate. With the gate narrowed to
  // `DatasetColumn` this returns all four ungrouped rows instead: the query
  // still compiles and the rows still look like data, which is exactly why
  // executing it is the only assertion that catches it.
  const region = _makeConceptAttributeColumn({
    id: "qc_1_region",
    name: "region",
    aggregation: "group_by",
  });
  const headcount = _makeConceptAttributeColumn({
    id: "qc_2_headcount",
    name: "headcount",
    dataType: "bigint",
    aggregation: "sum",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [region, headcount],
      orderByColumn: headcount.id,
      orderByDirection: "desc",
    }),
  );

  // North's two households sum to 7, so the aggregate's descending order is
  // a different order from `headcount`'s, whose largest single row is 5.
  await expect(_runQuery(sql)).resolves.toEqual([
    { region: "North", "sum(headcount)": 7 },
    { region: "South", "sum(headcount)": 3 },
    { region: "East", "sum(headcount)": 1 },
  ]);
});

it("filters a Concept's attributes before aggregating", async () => {
  // Filters, having, joins and limits were always relation-agnostic: they
  // work on quoted column names against a table name, so they start working
  // on a concept the moment the name resolves. One case holds that claim
  // rather than a suite that repeats every dataset case.
  const region = _makeConceptAttributeColumn({
    id: "qc_1_region",
    name: "region",
    aggregation: "group_by",
  });
  const headcount = _makeConceptAttributeColumn({
    id: "qc_2_headcount",
    name: "headcount",
    dataType: "bigint",
    aggregation: "sum",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [region, headcount],
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnId: headcount.id,
            operator: ">",
            value: 1,
          },
        ],
      },
      orderByColumn: region.id,
      orderByDirection: "asc",
    }),
  );

  // `p4` is East's only household and its headcount of 1 is filtered out, so
  // East disappears rather than summing to zero.
  await expect(_runQuery(sql)).resolves.toEqual([
    { region: "North", "sum(headcount)": 7 },
    { region: "South", "sum(headcount)": 3 },
  ]);
});

it("groups a Concept's records by status", async () => {
  const status = _makeConceptStatusColumn({
    id: "qc_1_status",
    aggregation: "group_by",
  });
  const records = _makeConceptAttributeColumn({
    id: "qc_2_region",
    name: "region",
    aggregation: "count",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [status, records],
      orderByColumn: status.id,
      orderByDirection: "asc",
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { status: "Confirmed", "count(region)": 2 },
    { status: "Ruled out", "count(region)": 1 },
    { status: "Suspected", "count(region)": 1 },
  ]);
});

it("filters a Concept's records by status", async () => {
  const externalId = _makeConceptAttributeColumn({
    id: "qc_1_external_id",
    name: "external_id",
  });
  const status = _makeConceptStatusColumn({ id: "qc_2_status" });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [externalId],
      sourceColumns: [externalId, status],
      filters: {
        type: "group",
        combinator: "AND",
        rules: [
          {
            type: "rule",
            columnId: status.id,
            operator: "=",
            value: "Confirmed",
          },
        ],
      },
      orderByColumn: externalId.id,
      orderByDirection: "asc",
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { external_id: "p1" },
    { external_id: "p3" },
  ]);
});

it("reads a field named like the record key from its own view column", async () => {
  // The view emits a field named `external_id` as `external_id_2`, because the
  // record key already has the plain name. The query must read the suffixed
  // column and still name its result after the field.
  const field = _makeConceptAttributeColumn({
    id: "qc_1_field",
    name: "external_id",
    aggregation: "group_by",
    sourceColumnName: "external_id_2",
  });
  const records = _makeConceptAttributeColumn({
    id: "qc_2_region",
    name: "region",
    aggregation: "count",
  });

  const sql = structuredQueryToSql(
    _makeQuery({
      dataSource: _makeConcept(),
      columns: [field, records],
      orderByColumn: field.id,
      orderByDirection: "asc",
      limit: 2,
    }),
  );

  await expect(_runQuery(sql)).resolves.toEqual([
    { external_id: "k1", "count(region)": 1 },
    { external_id: "k2", "count(region)": 1 },
  ]);
});
