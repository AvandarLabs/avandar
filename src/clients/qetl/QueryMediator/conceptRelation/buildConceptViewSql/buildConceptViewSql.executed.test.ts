import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
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
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { buildConceptViewSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import { withDuckDb } from "../../../../../../tests/integration/queries/executedDuckDb";
import type { DuckDbDataType } from "$/models/datasets/DatasetColumn/DuckDbDataTypes";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";
import type { DuckDBConnection } from "@duckdb/node-api";

const DATASET_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const DATASET_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const DATASET_C = "dddddddd-4444-4444-8444-dddddddddddd";
const CONCEPT_VIEW = "concept_cccccccc-3333-4333-8333-cccccccccccc";
const SPINE = `${CONCEPT_VIEW}__individuals`;

/**
 * Builds the fixture world: three contributing datasets as parquet, each with
 * its `ava_rows_` view, plus the spine.
 *
 * `p1` has two rows in dataset A, so `first` has something to be wrong about.
 * `p2` has two equally frequent regions in dataset B, so `most_frequent` has a
 * tie to break. `p3` is in the spine and in no dataset, which is the
 * missing-contribution case. Dataset C holds NULLs: `p1`'s first nickname is
 * NULL, and `p2` has two NULL nicknames and one real one.
 */
async function _seed(connection: DuckDBConnection): Promise<void> {
  const pathA = join(tmpdir(), "ava-concept-a.parquet");
  const pathB = join(tmpdir(), "ava-concept-b.parquet");
  const pathC = join(tmpdir(), "ava-concept-c.parquet");

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
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', CAST(NULL AS VARCHAR)),
        ('p1', 'Ada'),
        ('p2', NULL),
        ('p2', NULL),
        ('p2', 'Bo')
      ) AS t(person_id, nickname)
    ) TO '${pathC}' (FORMAT parquet)
  `);

  // Both views per dataset, exactly as production has them. Only `first` and
  // lists read the row-numbered view; `most_frequent` and the aggregates read
  // the dataset's public view, which does not expose `file_row_number` and does
  // not need to. A fixture with only one of the two hides that distinction.
  await connection.run(`
    CREATE VIEW "${DATASET_A}" AS SELECT * FROM read_parquet('${pathA}');
    CREATE VIEW "${DATASET_B}" AS SELECT * FROM read_parquet('${pathB}');
    CREATE VIEW "${DATASET_C}" AS SELECT * FROM read_parquet('${pathC}');
    CREATE VIEW "${getRowNumberedViewName(DATASET_A)}" AS
      SELECT * FROM read_parquet('${pathA}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(DATASET_B)}" AS
      SELECT * FROM read_parquet('${pathB}', file_row_number = true);
    CREATE VIEW "${getRowNumberedViewName(DATASET_C)}" AS
      SELECT * FROM read_parquet('${pathC}', file_row_number = true);
    CREATE TABLE "${SPINE}" AS
      SELECT * FROM (VALUES
        ('p1', 'Suspected'),
        ('p2', 'Confirmed'),
        ('p3', 'Suspected')
      ) AS t(external_id, status);
  `);
}

const AGE: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeId: "attr-age" as ConceptAttribute.Id,
  attributeName: "age",
  selectColumnName: "age_years",
  datasetId: DATASET_A,
  primaryKeyColumnName: "person_id",
  columnDataType: "bigint",
  valuePickerRuleType: "first",
  valueShape: "single",
};

const REGION: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeId: "attr-region" as ConceptAttribute.Id,
  attributeName: "region",
  selectColumnName: "region_name",
  datasetId: DATASET_B,
  primaryKeyColumnName: "hh_id",
  columnDataType: "varchar",
  valuePickerRuleType: "most_frequent",
  valueShape: "single",
};

const TAGS: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeId: "attr-tags" as ConceptAttribute.Id,
  attributeName: "tags",
  selectColumnName: "tag",
  datasetId: DATASET_A,
  primaryKeyColumnName: "person_id",
  columnDataType: "varchar",
  valueShape: "list",
};

const NOTE: ConceptAttributeColumn = {
  kind: "unmapped",
  attributeId: "attr-note" as ConceptAttribute.Id,
  attributeName: "note",
  duckDbDataType: "VARCHAR",
  valueShape: "single",
};

const NOTES: ConceptAttributeColumn = {
  kind: "unmapped",
  attributeId: "attr-notes" as ConceptAttribute.Id,
  attributeName: "notes",
  duckDbDataType: "VARCHAR",
  valueShape: "list",
};

const NICKNAME: ConceptAttributeColumn = {
  kind: "dataset_column",
  attributeId: "attr-nickname" as ConceptAttribute.Id,
  attributeName: "nickname",
  selectColumnName: "nickname",
  datasetId: DATASET_C,
  primaryKeyColumnName: "person_id",
  columnDataType: "varchar",
  valuePickerRuleType: "first",
  valueShape: "single",
};

/** The fixture a view is built over: how to seed it and what to call it. */
type ViewWorld = Readonly<{
  seed: (connection: DuckDBConnection) => Promise<void>;
  viewName: string;
  spineTableName: string;
}>;

const DEFAULT_WORLD: ViewWorld = {
  seed: _seed,
  viewName: CONCEPT_VIEW,
  spineTableName: SPINE,
};

/**
 * Seeds the world, creates the view from the given columns, and hands the
 * connection to `run`.
 */
async function _withConceptView<Result>(
  options: Readonly<{
    world: ViewWorld;
    attributeColumns: readonly ConceptAttributeColumn[];
    run: (connection: DuckDBConnection) => Promise<Result>;
  }>,
): Promise<Result> {
  const { world, attributeColumns, run } = options;
  return await withDuckDb(async (connection) => {
    await world.seed(connection);
    await connection.run(
      buildConceptViewSql({
        viewName: world.viewName,
        spineTableName: world.spineTableName,
        attributeColumns,
      }),
    );
    return await run(connection);
  });
}

/** Creates the view from the given columns and returns its rows. */
async function _queryView(
  attributeColumns: readonly ConceptAttributeColumn[],
): Promise<Array<Record<string, unknown>>> {
  return await _withConceptView({
    world: DEFAULT_WORLD,
    attributeColumns,
    run: async (connection) => {
      const reader = await connection.runAndReadAll(
        `SELECT * FROM "${DEFAULT_WORLD.viewName}" ORDER BY external_id`,
      );
      return reader.getRowObjects().map(_normalize);
    },
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
  // A join-based shape would return a record once per contributing dataset.
  // The spine-plus-subquery shape prevents that.
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

    expect(rows[2]).toEqual({
      external_id: "p3",
      status: "Suspected",
      age: null,
      region: null,
    });
  });

  // `p1` has ages 41 then 42 in file order. `first` must return 41 every time,
  // which is only true because the subquery orders by `file_row_number`.
  it("resolves `first` deterministically when a key has several rows", async () => {
    const rows = await _queryView([AGE]);

    expect(rows[0]).toEqual({
      external_id: "p1",
      status: "Suspected",
      age: 41,
    });
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

    expect(rows[1]).toEqual({
      external_id: "p2",
      status: "Confirmed",
      region: "East",
    });
  });

  // An array attribute keeps every contributed value, ordered by row number,
  // and an individual contributing none gets an empty list rather than NULL.
  it("collects array attributes in row order and empties to a list", async () => {
    const rows = await _queryView([TAGS]);

    expect(rows[0]).toEqual({
      external_id: "p1",
      status: "Suspected",
      tags: ["blue", "green"],
    });
    expect(rows[1]).toEqual({
      external_id: "p2",
      status: "Confirmed",
      tags: ["red"],
    });
    expect(rows[2]).toEqual({
      external_id: "p3",
      status: "Suspected",
      tags: [],
    });
  });

  // An attribute with no dataset contribution still occupies a typed column, so
  // the relation's schema does not change shape when a mapping is absent.
  it("emits an unmapped attribute as a typed NULL column", async () => {
    const rows = await _queryView([NOTE]);

    expect(rows[0]).toEqual({
      external_id: "p1",
      status: "Suspected",
      note: null,
    });
  });

  // A list field with nothing to read is an empty list of its type, not a
  // NULL scalar, so SQL that treats it as a list, as chat is told to, binds.
  it("emits an unmapped list attribute as an empty typed list", async () => {
    const rows = await _queryView([NOTES]);

    expect(
      rows.map((row) => {
        return row.notes;
      }),
    ).toEqual([[], [], []]);
  });

  it("types an unmapped list attribute as a list of its type", async () => {
    const columnTypes = await _withConceptView({
      world: DEFAULT_WORLD,
      attributeColumns: [NOTES],
      run: async (connection) => {
        const reader = await connection.runAndReadAll(
          `SELECT DISTINCT typeof("notes") AS column_type FROM "${DEFAULT_WORLD.viewName}"`,
        );
        return reader.getRowObjects();
      },
    });

    expect(columnTypes).toEqual([{ column_type: "VARCHAR[]" }]);
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

  // Every case type's relation has a `status` column, read from the spine,
  // whatever attributes it has. This is the column the Data Explorer offers.
  it("exposes each record's status as the status column", async () => {
    const rows = await _queryView([]);

    expect(rows).toEqual([
      { external_id: "p1", status: "Suspected" },
      { external_id: "p2", status: "Confirmed" },
      { external_id: "p3", status: "Suspected" },
    ]);
  });

  // An attribute column named `status` would give the view two columns of one
  // name, which does not compile. The spine's column wins.
  it("keeps the spine's status when an attribute column is named status", async () => {
    const rows = await _queryView([
      {
        kind: "unmapped",
        attributeId: "attr-status" as ConceptAttribute.Id,
        attributeName: "status",
        duckDbDataType: "VARCHAR",
        valueShape: "single",
      },
    ]);

    expect(rows[1]).toEqual({ external_id: "p2", status: "Confirmed" });
  });

  // NULL means "no value". `p1`'s first nickname is NULL, so `first` has to
  // read past it rather than report that `p1` has none.
  it("reads the first non-NULL value rather than a leading NULL", async () => {
    const rows = await _queryView([NICKNAME]);

    expect(rows[0]).toEqual({
      external_id: "p1",
      status: "Suspected",
      nickname: "Ada",
    });
  });

  // `p2` has two NULL nicknames and one `Bo`. Counting NULL as a value would
  // make NULL the most frequent.
  it("ignores NULL under most_frequent even when it is the most common cell", async () => {
    const rows = await _queryView([
      { ...NICKNAME, valuePickerRuleType: "most_frequent" },
    ]);

    expect(rows[1]).toEqual({
      external_id: "p2",
      status: "Confirmed",
      nickname: "Bo",
    });
  });

  it("leaves NULL values out of a list column", async () => {
    const rows = await _queryView([
      { ...NICKNAME, attributeName: "nicknames", valueShape: "list" },
    ]);

    expect(
      rows.map((row) => {
        return row.nicknames;
      }),
    ).toEqual([["Ada"], ["Bo"], []]);
  });
});

const DATASET_TYPED = "ffffffff-6666-4666-8666-ffffffffffff";
const TYPED_VIEW = "concept_eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
const TYPED_SPINE = `${TYPED_VIEW}__individuals`;

/**
 * One dataset with a column of every type a rule can keep, for checking the
 * type each rule emits.
 *
 * `p1` ties at the maximum twice (two rows share the latest `seen_on`, and
 * two share the most `visits`) and has a row of NULLs, so a rule that counted
 * or compared NULL would show it. `p1` also holds four words that sort
 * differently by byte order and alphabetically ("apple", "Zebra", "Ángel",
 * "Apple"), and two UUIDs. `p2` has a NULL row, then "apple" and "Apple",
 * which tie alphabetically, and `word_reversed` holds the same two values in
 * the opposite order. `p3` has no row.
 */
async function _seedTyped(connection: DuckDBConnection): Promise<void> {
  const path = join(tmpdir(), "ava-concept-typed.parquet");
  await connection.run(`
    COPY (
      SELECT * FROM (VALUES
        ('p1', '9', 3::BIGINT, 1.5::DOUBLE, DATE '2024-03-01', TIME '08:00', TIMESTAMP '2024-03-01 08:00', 'apple', NULL, UUID '00000000-0000-4000-8000-000000000001'),
        ('p1', '10', 3::BIGINT, NULL::DOUBLE, DATE '2024-03-01', TIME '17:30', TIMESTAMP '2024-03-09 17:30', 'Zebra', NULL, UUID '00000000-0000-4000-8000-000000000002'),
        ('p1', NULL, NULL::BIGINT, 2.5::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP, 'Ángel', NULL, NULL),
        ('p1', NULL, NULL::BIGINT, NULL::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP, 'Apple', NULL, NULL),
        ('p2', NULL, NULL::BIGINT, NULL::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP, NULL, NULL, NULL),
        ('p2', NULL, NULL::BIGINT, NULL::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP, 'apple', 'Apple', NULL),
        ('p2', NULL, NULL::BIGINT, NULL::DOUBLE, NULL::DATE, NULL::TIME, NULL::TIMESTAMP, 'Apple', 'apple', NULL)
      ) AS t(person_id, code, visits, weight, seen_on, seen_time, seen_at, word, word_reversed, ref)
    ) TO '${path}' (FORMAT parquet)
  `);
  await connection.run(`
    CREATE VIEW "${DATASET_TYPED}" AS SELECT * FROM read_parquet('${path}');
    CREATE VIEW "${getRowNumberedViewName(DATASET_TYPED)}" AS
      SELECT * FROM read_parquet('${path}', file_row_number = true);
    CREATE TABLE "${TYPED_SPINE}" AS
      SELECT * FROM (VALUES ('p1', 'Active'), ('p2', 'Active'), ('p3', 'Active'))
        AS t(external_id, status);
  `);
}

const TYPED_WORLD: ViewWorld = {
  seed: _seedTyped,
  viewName: TYPED_VIEW,
  spineTableName: TYPED_SPINE,
};

/** One single-value field over the typed dataset, and the type it reads. */
type TypedField = Readonly<{
  column: ConceptAttributeColumn;
  ruleType: ValuePickerRule.T;
  sourceDuckDbType: DuckDbDataType;
}>;

function _typedField(
  options: Readonly<{
    attributeName: string;
    selectColumnName: string;
    sourceDuckDbType: DuckDbDataType;
    ruleType: ValuePickerRule.T;
  }>,
): TypedField {
  return {
    ruleType: options.ruleType,
    sourceDuckDbType: options.sourceDuckDbType,
    column: {
      kind: "dataset_column",
      attributeId: `attr-${options.attributeName}` as ConceptAttribute.Id,
      attributeName: options.attributeName,
      selectColumnName: options.selectColumnName,
      datasetId: DATASET_TYPED,
      columnDataType: DuckDbDataTypeUtils.toAvaDataType(
        options.sourceDuckDbType,
      ),
      primaryKeyColumnName: "person_id",
      valuePickerRuleType: options.ruleType,
      valueShape: "single",
    },
  };
}

const TYPED_FIELDS: readonly TypedField[] = [
  _typedField({
    attributeName: "latest_seen",
    selectColumnName: "seen_on",
    sourceDuckDbType: "DATE",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "earliest_time",
    selectColumnName: "seen_time",
    sourceDuckDbType: "TIME",
    ruleType: "min",
  }),
  _typedField({
    attributeName: "latest_seen_at",
    selectColumnName: "seen_at",
    sourceDuckDbType: "TIMESTAMP",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "last_code",
    selectColumnName: "code",
    sourceDuckDbType: "VARCHAR",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "first_code",
    selectColumnName: "code",
    sourceDuckDbType: "VARCHAR",
    ruleType: "min",
  }),
  _typedField({
    attributeName: "last_word",
    selectColumnName: "word",
    sourceDuckDbType: "VARCHAR",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "first_word",
    selectColumnName: "word",
    sourceDuckDbType: "VARCHAR",
    ruleType: "min",
  }),
  _typedField({
    attributeName: "first_word_reversed",
    selectColumnName: "word_reversed",
    sourceDuckDbType: "VARCHAR",
    ruleType: "min",
  }),
  _typedField({
    attributeName: "last_word_reversed",
    selectColumnName: "word_reversed",
    sourceDuckDbType: "VARCHAR",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "last_ref",
    selectColumnName: "ref",
    sourceDuckDbType: "UUID",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "most_visits",
    selectColumnName: "visits",
    sourceDuckDbType: "BIGINT",
    ruleType: "max",
  }),
  _typedField({
    attributeName: "code_count",
    selectColumnName: "code",
    sourceDuckDbType: "VARCHAR",
    ruleType: "count",
  }),
  _typedField({
    attributeName: "total_visits",
    selectColumnName: "visits",
    sourceDuckDbType: "BIGINT",
    ruleType: "sum",
  }),
  _typedField({
    attributeName: "average_weight",
    selectColumnName: "weight",
    sourceDuckDbType: "DOUBLE",
    ruleType: "avg",
  }),
];

const TYPED_COLUMNS: readonly ConceptAttributeColumn[] = TYPED_FIELDS.map(
  (field) => {
    return field.column;
  },
);

/** The typed view's DuckDB column types, by column name. */
async function _describeTypedView(): Promise<Record<string, string>> {
  return await _withConceptView({
    world: TYPED_WORLD,
    attributeColumns: TYPED_COLUMNS,
    run: async (connection) => {
      const reader = await connection.runAndReadAll(`DESCRIBE "${TYPED_VIEW}"`);
      return Object.fromEntries(
        reader.getRowObjectsJson().map((row) => {
          return [String(row.column_name), String(row.column_type)];
        }),
      );
    },
  });
}

/**
 * The typed view's rows in DuckDB's JSON form: dates and times as text,
 * `BIGINT` as a string, `DOUBLE` as a number. It does not use `_queryView`,
 * whose `getRowObjects()` returns a date as a DuckDB value object that has
 * no plain-text form to assert on.
 */
async function _queryTypedView(): Promise<Array<Record<string, unknown>>> {
  return await _withConceptView({
    world: TYPED_WORLD,
    attributeColumns: TYPED_COLUMNS,
    run: async (connection) => {
      const reader = await connection.runAndReadAll(
        `SELECT * FROM "${TYPED_VIEW}" ORDER BY external_id`,
      );
      return reader.getRowObjectsJson();
    },
  });
}

describe("buildConceptViewSql value rule output types", () => {
  it("emits each rule's output type as the view column's type", async () => {
    expect(await _describeTypedView()).toMatchObject({
      latest_seen: "DATE",
      earliest_time: "TIME",
      latest_seen_at: "TIMESTAMP",
      last_code: "VARCHAR",
      first_code: "VARCHAR",
      most_visits: "BIGINT",
      code_count: "BIGINT",
      total_visits: "DOUBLE",
      average_weight: "DOUBLE",
    });
  });

  // The rule table is what the rest of the app trusts for a field's type, so
  // a rule whose SQL emits another type than the table says is a defect.
  it("emits the type the rule table declares for every rule", async () => {
    const describedTypes = await _describeTypedView();

    const actual = Object.fromEntries(
      TYPED_FIELDS.map((field) => {
        const describedType = describedTypes[field.column.attributeName];
        return [
          field.column.attributeName,
          DuckDbDataTypeUtils.toAvaDataType(describedType as DuckDbDataType),
        ];
      }),
    );
    const expected = Object.fromEntries(
      TYPED_FIELDS.map((field) => {
        return [
          field.column.attributeName,
          ValuePickerRule.getOutputDataType({
            ruleType: field.ruleType,
            columnDataType: DuckDbDataTypeUtils.toAvaDataType(
              field.sourceDuckDbType,
            ),
          }),
        ];
      }),
    );

    expect(actual).toEqual(expected);
  });

  it("takes the latest date and timestamp and the earliest time, ignoring NULLs", async () => {
    const [p1, p2, p3] = await _queryTypedView();

    expect([p1?.latest_seen, p1?.latest_seen_at, p1?.earliest_time]).toEqual([
      "2024-03-01",
      "2024-03-09 17:30:00",
      "08:00:00",
    ]);
    expect([p2?.latest_seen, p3?.latest_seen]).toEqual([null, null]);
  });

  it("compares text alphabetically under max and min, so '9' still beats '10'", async () => {
    const [p1] = await _queryTypedView();

    expect([p1?.last_code, p1?.first_code]).toEqual(["9", "10"]);
  });

  it("ignores case and accents when comparing text, and returns the original value", async () => {
    const [p1] = await _queryTypedView();

    // Byte order would give "Ángel" for max and "Apple" for min.
    expect([p1?.last_word, p1?.first_word]).toEqual(["Zebra", "Ángel"]);
  });

  it("breaks an alphabetical tie by the value in the rule's direction", async () => {
    const [, p2] = await _queryTypedView();

    expect([p2?.last_word, p2?.first_word]).toEqual(["apple", "Apple"]);
  });

  // The same tie with the rows in the opposite order, so a missing tie-break
  // fails whichever row a tie returns.
  it("breaks the tie the same way whichever tied row comes first", async () => {
    const [, p2] = await _queryTypedView();

    expect([p2?.last_word_reversed, p2?.first_word_reversed]).toEqual([
      "apple",
      "Apple",
    ]);
  });

  it("compares a column that DuckDB does not store as VARCHAR, such as a UUID", async () => {
    const [p1] = await _queryTypedView();

    expect(p1?.last_ref).toBe("00000000-0000-4000-8000-000000000002");
  });

  it("counts the non-NULL values, and zero for a record no row matches", async () => {
    const rows = await _queryTypedView();

    expect(
      rows.map((row) => {
        return row.code_count;
      }),
    ).toEqual(["2", "0", "0"]);
  });

  it("sums whole numbers into a decimal and skips NULLs", async () => {
    const [p1, p2] = await _queryTypedView();

    expect(p1?.total_visits).toBe(6);
    expect(p2?.total_visits).toBeNull();
  });

  it("averages the non-NULL values", async () => {
    const [p1] = await _queryTypedView();

    expect(p1?.average_weight).toBe(2);
  });

  it("keeps a whole number whole under max, even when two rows tie", async () => {
    const [p1] = await _queryTypedView();

    expect(p1?.most_visits).toBe("3");
  });
});
