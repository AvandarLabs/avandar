import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import type { DuckDBConnection } from "@duckdb/node-api";

/**
 * Executed tests for the concept relation view.
 *
 * Every case runs the emitted SQL against a real DuckDB over real parquet
 * files and asserts the rows. That is the point: the properties this view has
 * to guarantee (one row per individual, a missing contribution being NULL
 * rather than a lost row, and a deterministic value under a tie) are all
 * properties of returned rows. A test that inspected the SQL text would pass
 * while the grain was wrong.
 *
 * Fixtures are constructed to TIE on purpose. A value picker that is
 * deterministic only in the absence of ties is not deterministic, so a fixture
 * without ties would assert nothing about determinism.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildConceptViewSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql";
import { withDuckDb } from "@/lib/sql/__tests__/executedDuckDb";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

const DATASET_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const DATASET_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const CONCEPT_VIEW = "concept_cccccccc-3333-4333-8333-cccccccccccc";
const SPINE = `${CONCEPT_VIEW}__individuals`;

/**
 * Builds the fixture world: two contributing datasets as parquet, each with its
 * `ava_rows_` view, plus the spine.
 *
 * `p1` has two rows in dataset A, so `first` has something to be wrong about.
 * `p2` has two equally frequent regions in dataset B, so `most_frequent` has a
 * tie to break. `p3` is in the spine and in no dataset, which is the
 * missing-contribution case.
 */
async function _seed(connection: DuckDBConnection): Promise<void> {
  const pathA = join(tmpdir(), "ava-concept-a.parquet");
  const pathB = join(tmpdir(), "ava-concept-b.parquet");

  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', 41, 'blue'),
        ('p1', 42, 'green'),
        ('p2', 50, 'red')
      ) AS t(person_id, age_years, tag)
    ) TO '${pathA}' (FORMAT parquet)
  `);
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', 'North'),
        ('p2', 'South'),
        ('p2', 'East')
      ) AS t(hh_id, region_name)
    ) TO '${pathB}' (FORMAT parquet)
  `);

  // Both views per dataset, exactly as production has them. Only the `first`
  // rule reads the row-numbered view; `most_frequent` and the aggregates read
  // the dataset's public view, which does not expose `file_row_number` and does
  // not need to. A fixture with only one of the two hides that distinction.
  await connection.run(`
    CREATE VIEW "${DATASET_A}" AS SELECT * FROM read_parquet('${pathA}');
    CREATE VIEW "${DATASET_B}" AS SELECT * FROM read_parquet('${pathB}');
    CREATE VIEW "${getRowNumberedViewName(DATASET_A)}" AS
      SELECT * FROM read_parquet('${pathA}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(DATASET_B)}" AS
      SELECT * FROM read_parquet('${pathB}', file_row_number = true);
    CREATE TABLE "${SPINE}" AS
      SELECT * FROM (VALUES ('p1'), ('p2'), ('p3')) AS t(external_id);
  `);
}

const AGE: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeName: "age",
  selectColumnName: "age_years",
  datasetId: DATASET_A,
  primaryKeyColumnName: "person_id",
  valuePickerRuleType: "first",
  isArray: false,
};

const REGION: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeName: "region",
  selectColumnName: "region_name",
  datasetId: DATASET_B,
  primaryKeyColumnName: "hh_id",
  valuePickerRuleType: "most_frequent",
  isArray: false,
};

const TAGS: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeName: "tags",
  selectColumnName: "tag",
  datasetId: DATASET_A,
  primaryKeyColumnName: "person_id",
  valuePickerRuleType: "first",
  isArray: true,
};

const NOTE: ConceptAttributeColumn = {
  kind: "unmapped",
  attributeName: "note",
  duckDbDataType: "VARCHAR",
};

/** Creates the view from the given columns and returns its rows. */
async function _queryView(
  attributeColumns: readonly ConceptAttributeColumn[],
): Promise<Array<Record<string, unknown>>> {
  return await withDuckDb(async (connection) => {
    await _seed(connection);
    await connection.run(
      buildConceptViewSql({
        viewName: CONCEPT_VIEW,
        spineTableName: SPINE,
        attributeColumns,
      }),
    );
    const reader = await connection.runAndReadAll(
      `SELECT * FROM "${CONCEPT_VIEW}" ORDER BY external_id`,
    );
    return reader.getRowObjects().map(_normalize);
  });
}

/** DuckDB returns integers as bigint and lists as array-likes. */
function _normalize(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (typeof value === "bigint") {
        return [key, Number(value)];
      }
      if (value !== null && typeof value === "object" && "items" in value) {
        return [key, (value as { items: unknown[] }).items];
      }
      return [key, value];
    }),
  );
}

describe("buildConceptViewSql", () => {
  // The grain claim. Three individuals in the spine must be three rows out,
  // even though `p1` has two rows in dataset A and `p2` has two in dataset B.
  // Today's concatenating implementation emits an individual once per
  // contributing dataset, which is the bug this shape removes.
  it("emits exactly one row per individual regardless of contributions", async () => {
    const rows = await _queryView([AGE, REGION]);

    const ids = rows.map((row) => {
      return row.external_id;
    });

    expect(ids).toEqual(["p1", "p2", "p3"]);
  });

  // A missing contribution must be NULL, not a dropped row. `p3` is in no
  // dataset; it still appears, with every attribute NULL.
  it("keeps an individual no dataset contributes to, with NULL attributes", async () => {
    const rows = await _queryView([AGE, REGION]);

    expect(rows[2]).toEqual({ external_id: "p3", age: null, region: null });
  });

  // `p1` has ages 41 then 42 in file order. `first` must return 41 every time,
  // which is only true because the subquery orders by `file_row_number`.
  it("resolves `first` deterministically when a key has several rows", async () => {
    const rows = await _queryView([AGE]);

    expect(rows[0]).toEqual({ external_id: "p1", age: 41 });
  });

  // Ten consecutive runs, because the defect this replaces was observed
  // returning four different values in six runs. One run proves nothing.
  it("returns the same `first` value across ten consecutive runs", async () => {
    const results = [];
    for (let run = 0; run < 10; run += 1) {
      const rows = await _queryView([AGE]);
      results.push(rows[0]?.age);
    }

    const expected = Array.from({ length: 10 }, () => {
      return 41;
    });

    expect(results).toEqual(expected);
  });

  // `p2` has South and East once each, a genuine tie on COUNT(*). The value
  // tie-break must pick 'East' every time, being lexicographically first.
  it("breaks a `most_frequent` tie by value rather than arbitrarily", async () => {
    const rows = await _queryView([REGION]);

    expect(rows[1]).toEqual({ external_id: "p2", region: "East" });
  });

  // An array attribute keeps every contributed value, ordered by row number,
  // and an individual contributing none gets an empty list rather than NULL.
  it("collects array attributes in row order and empties to a list", async () => {
    const rows = await _queryView([TAGS]);

    expect(rows[0]).toEqual({ external_id: "p1", tags: ["blue", "green"] });
    expect(rows[1]).toEqual({ external_id: "p2", tags: ["red"] });
    expect(rows[2]).toEqual({ external_id: "p3", tags: [] });
  });

  // An attribute with no dataset contribution still occupies a typed column, so
  // the relation's schema does not change shape when a mapping is absent.
  it("emits an unmapped attribute as a typed NULL column", async () => {
    const rows = await _queryView([NOTE]);

    expect(rows[0]).toEqual({ external_id: "p1", note: null });
  });

  // Why the loader has to mark this statement trusted internal SQL, asserted
  // against the real analyzer rather than reasoned about. The view's `FROM` is
  // the spine table, whose name deliberately resolves to no relation, so the
  // fail-closed analyzer cannot account for it and reports
  // `uninspectable-source`. `runRawQuery` accepts that reason *only* for
  // trusted internal SQL, so a loader that forgot the flag would fail every
  // concept query at runtime while every test of this builder still passed.
  //
  // The contributing datasets are still reported, which is what keeps the lease
  // and the workspace table assertions applying to them: dataset A is reached
  // only through its `ava_rows_` view, and it appears here anyway.
  it("emits SQL the analyzer can only accept as trusted internal SQL", () => {
    const viewSql = buildConceptViewSql({
      viewName: CONCEPT_VIEW,
      spineTableName: SPINE,
      attributeColumns: [AGE, REGION, TAGS, NOTE],
    });

    expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(viewSql)).toEqual({
      kind: "unsafe",
      reason: "uninspectable-source",
      datasetIds: [DATASET_A, DATASET_B],
    });
  });

  // Byte-identical SQL for unchanged metadata, regardless of input order, is
  // what lets the definition be hashed into a cache key later.
  it("emits columns in a stable order whatever order they arrive in", () => {
    const forward = buildConceptViewSql({
      viewName: CONCEPT_VIEW,
      spineTableName: SPINE,
      attributeColumns: [AGE, REGION, NOTE],
    });
    const reversed = buildConceptViewSql({
      viewName: CONCEPT_VIEW,
      spineTableName: SPINE,
      attributeColumns: [NOTE, REGION, AGE],
    });

    expect(forward).toBe(reversed);
  });

  // Exit criteria 3 and 4: joins are raw SQL in Data Explorer, so the view
  // has to survive JOIN / WHERE / GROUP BY / ORDER BY against a contributing
  // dataset. `p2`'s region is East (most_frequent tie-break); joining to
  // dataset B matches both of p2's rows, so East counts 2 and sorts first.
  it("joins to a dataset, then filters, groups, and sorts", async () => {
    const rows = await withDuckDb(async (connection) => {
      await _seed(connection);
      await connection.run(
        buildConceptViewSql({
          viewName: CONCEPT_VIEW,
          spineTableName: SPINE,
          attributeColumns: [AGE, REGION],
        }),
      );
      const reader = await connection.runAndReadAll(`
        SELECT c.region, COUNT(*) AS n
        FROM "${CONCEPT_VIEW}" c
        JOIN "${DATASET_B}" d
          ON CAST(c.external_id AS VARCHAR) = CAST(d.hh_id AS VARCHAR)
        WHERE c.region IS NOT NULL
        GROUP BY c.region
        ORDER BY n DESC, c.region
      `);
      return reader.getRowObjects().map(_normalize);
    });

    expect(rows).toEqual([
      { region: "East", n: 2 },
      { region: "North", n: 1 },
    ]);
  });
});
