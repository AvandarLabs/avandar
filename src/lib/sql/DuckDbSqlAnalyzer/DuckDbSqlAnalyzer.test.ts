/** Tests dataset dependency extraction from SQL table references. */

import { describe, expect, it } from "vitest";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

const DATASET_ID = "22222222-2222-4222-8222-222222222222";
const JOINED_DATASET_ID = "33333333-3333-4333-8333-333333333333";
const LITERAL_ID = "44444444-4444-4444-8444-444444444444";
const CONCEPT_ID = "9a8b7c6d-2222-4333-8444-f6e5d4c3b2a1";

describe("DuckDbSqlAnalyzer/DuckDbSqlAnalyzer", () => {
  it("extracts UUID tables while ignoring UUID string literals", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}" WHERE id = '${LITERAL_ID}'`,
      ),
    ).toEqual([DATASET_ID]);
  });

  it("ignores a UUID-shaped CTE alias", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `WITH "${LITERAL_ID}" AS (SELECT * FROM "${DATASET_ID}")
         SELECT * FROM "${LITERAL_ID}"`,
      ),
    ).toEqual([DATASET_ID]);
  });

  it("supports DuckDB EXCLUDE, QUALIFY, and PIVOT syntax", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * EXCLUDE (secret) FROM "${DATASET_ID}"
         QUALIFY row_number() OVER () = 1`,
      ),
    ).toEqual([DATASET_ID]);
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `PIVOT "${JOINED_DATASET_ID}" ON category USING sum(value)`,
      ),
    ).toEqual([JOINED_DATASET_ID]);
  });

  it("deduplicates table references in first-seen order", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}"
         JOIN "${JOINED_DATASET_ID}" ON true
         JOIN "${DATASET_ID}" AS repeated ON true`,
      ),
    ).toEqual([DATASET_ID, JOINED_DATASET_ID]);
  });

  it("extracts every table in a comma-separated FROM clause", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}", "${JOINED_DATASET_ID}"`,
      ),
    ).toEqual([DATASET_ID, JOINED_DATASET_ID]);
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM (SELECT * FROM "${DATASET_ID}"), "${JOINED_DATASET_ID}"`,
      ),
    ).toEqual([DATASET_ID, JOINED_DATASET_ID]);
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}", "${JOINED_DATASET_ID}" JOIN "${LITERAL_ID}" ON true`,
      ),
    ).toEqual([DATASET_ID, JOINED_DATASET_ID, LITERAL_ID]);
  });

  it("extracts constant query_table and recursive query sources", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM query_table('${DATASET_ID}')`,
      ),
    ).toEqual([DATASET_ID]);
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM query('SELECT * FROM "${DATASET_ID}" JOIN "${JOINED_DATASET_ID}" ON true')`,
      ),
    ).toEqual([DATASET_ID, JOINED_DATASET_ID]);
  });

  it("extracts three-part and SUMMARIZE table references", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SUMMARIZE memory.main."${DATASET_ID}"`,
      ),
    ).toEqual([DATASET_ID]);
  });

  it("scopes CTE aliases without suppressing qualified real tables", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `WITH "${LITERAL_ID}"(value) AS MATERIALIZED (
           SELECT * FROM "${DATASET_ID}"
         ), "${JOINED_DATASET_ID}"(value) AS NOT MATERIALIZED (
           SELECT * FROM memory.main."${JOINED_DATASET_ID}"
         )
         SELECT * FROM "${LITERAL_ID}"
         JOIN "${JOINED_DATASET_ID}" ON true
         UNION ALL SELECT * FROM memory.main."${LITERAL_ID}"`,
      ),
    ).toEqual([DATASET_ID, JOINED_DATASET_ID, LITERAL_ID]);
  });

  it("rejects dynamic table and query sources without returning partial IDs", () => {
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}", query_table(dataset_name)`,
      );
    }).toThrow(/dynamic/i);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM query('SELECT * FROM "' || dataset_name)`,
      );
    }).toThrow(/dynamic/i);
  });

  it("does not read the FROM inside EXTRACT, TRIM, SUBSTRING, or OVERLAY as a table", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT date_trunc('month', "date") AS month, SUM("deaths")
         FROM "${DATASET_ID}"
         WHERE EXTRACT(year FROM "date") = 2022
         GROUP BY 1`,
      ),
    ).toEqual([DATASET_ID]);
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT extract(MONTH FROM "date"), TRIM(BOTH ' ' FROM "county"),
           SUBSTRING("county" FROM 1 FOR 3),
           OVERLAY("county" PLACING 'x' FROM 2 FOR 1)
         FROM "${DATASET_ID}"`,
      ),
    ).toEqual([DATASET_ID]);
  });

  it("still analyzes a subquery nested inside EXTRACT", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT EXTRACT(year FROM (SELECT max("date") FROM "${JOINED_DATASET_ID}"))
         FROM "${DATASET_ID}"`,
      ),
    ).toEqual([JOINED_DATASET_ID, DATASET_ID]);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT EXTRACT(year FROM (SELECT max("date") FROM read_csv('x.csv')))
         FROM "${DATASET_ID}"`,
      );
    }).toThrow(/uninspectable-source/);
  });

  it("treats json_each like unnest when exploding a UUID table's JSON", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}", json_each('{"features":[]}')`,
      ),
    ).toEqual([DATASET_ID]);
  });

  it("rejects mutating statements and uninspectable table functions", () => {
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `CREATE TABLE "${LITERAL_ID}" AS SELECT * FROM "${DATASET_ID}"`,
      );
    }).toThrow(/mutating/i);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM dataset_macro('${DATASET_ID}')`,
      );
    }).toThrow(/inspect/i);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM read_parquet('${DATASET_ID}.parquet')`,
      );
    }).toThrow(/inspect/i);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        "SELECT * FROM workspace_alias",
      );
    }).toThrow(/inspect/i);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        "SELECT * FROM query_table('workspace_alias')",
      );
    }).toThrow(/inspect/i);
  });

  it("rejects empty and unrecognized statements", () => {
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences("");
    }).toThrow(/invalid/i);
    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences("arbitrary words");
    }).toThrow(/invalid/i);
  });

  it("retains every known source before a nested dynamic boundary", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM query('SELECT * FROM "${DATASET_ID}", query_table(dataset_name)')`,
      ),
    ).toEqual({
      kind: "unsafe",
      reason: "dynamic-query",
      datasetIds: [DATASET_ID],
    });
  });

  it("distinguishes mutation targets from read sources", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `CREATE TABLE "${LITERAL_ID}" AS SELECT * FROM "${DATASET_ID}"`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [DATASET_ID],
      mutatedDatasetIds: [LITERAL_ID],
    });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `DELETE FROM "${JOINED_DATASET_ID}"`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [JOINED_DATASET_ID],
      mutatedDatasetIds: [JOINED_DATASET_ID],
    });
  });

  // `generateIndividuals` stages rows with CREATE TABLE AS SELECT. The
  // read-only entry point refuses mutating SQL, so the session has to ask
  // for the datasets the statement *reads* rather than for a SELECT list.
  it("returns the datasets a CREATE TABLE AS SELECT reads", () => {
    const stagingSql =
      `DROP TABLE IF EXISTS "ava_staging_individuals_${CONCEPT_ID}";\n` +
      `CREATE TABLE "ava_staging_individuals_${CONCEPT_ID}" AS ` +
      `SELECT * FROM "${DATASET_ID}"`;

    expect(() => {
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(stagingSql);
    }).toThrow(/mutating/i);
    expect(DuckDbSqlAnalyzer.getReadDatasetIdsFromSql(stagingSql)).toEqual([
      DATASET_ID,
    ]);
  });

  it("tracks COPY relations according to transfer direction", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `COPY '${DATASET_ID}' TO '${DATASET_ID}.temp' (FORMAT 'parquet', COMPRESSION 'ZSTD')`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [DATASET_ID],
      mutatedDatasetIds: [],
    });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `COPY '${DATASET_ID}' FROM 'dataset.parquet'`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [],
      mutatedDatasetIds: [DATASET_ID],
    });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `COPY (SELECT * FROM "${DATASET_ID}" JOIN "${JOINED_DATASET_ID}" ON true) TO 'dataset.parquet'`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [DATASET_ID, JOINED_DATASET_ID],
      mutatedDatasetIds: [],
    });
  });

  it("rejects non-UUID single-quoted COPY relations", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        "COPY 'workspace_alias' TO 'dataset.parquet'",
      ),
    ).toMatchObject({ kind: "unsafe" });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        "COPY 'workspace_alias' FROM 'dataset.parquet'",
      ),
    ).toMatchObject({ kind: "unsafe" });
  });

  it("rejects non-UUID unquoted COPY FROM relations", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        "COPY workspace_alias FROM 'dataset.parquet'",
      ),
    ).toMatchObject({ kind: "unsafe" });
  });

  it("rejects non-UUID double-quoted COPY FROM relations", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `COPY "workspace_alias" FROM 'dataset.parquet'`,
      ),
    ).toMatchObject({ kind: "unsafe" });
  });

  it("tracks DELETE and MERGE USING sources", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `DELETE FROM "${DATASET_ID}" USING "${JOINED_DATASET_ID}", "${LITERAL_ID}" WHERE true`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [DATASET_ID, JOINED_DATASET_ID, LITERAL_ID],
      mutatedDatasetIds: [DATASET_ID],
    });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `MERGE INTO "${DATASET_ID}" USING "${JOINED_DATASET_ID}" ON true WHEN MATCHED THEN UPDATE SET value = 1`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [JOINED_DATASET_ID],
      mutatedDatasetIds: [DATASET_ID],
    });
  });

  it("tracks both sides of a table rename", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `ALTER TABLE "${DATASET_ID}" RENAME TO "${JOINED_DATASET_ID}"`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [],
      mutatedDatasetIds: [DATASET_ID, JOINED_DATASET_ID],
    });
  });

  it("rejects unsupported comma-separated mutation targets", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `DROP TABLE "${DATASET_ID}", "${JOINED_DATASET_ID}"`,
      ),
    ).toMatchObject({ kind: "unsafe" });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `TRUNCATE "${DATASET_ID}", "${JOINED_DATASET_ID}"`,
      ),
    ).toMatchObject({ kind: "unsafe" });
  });

  it("returns a prefixed concept table as a concept relation", () => {
    const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
      `SELECT * FROM "concept_${CONCEPT_ID}"`,
    );

    expect(analysis).toEqual({
      kind: "read",
      relations: [{ kind: "concept", id: CONCEPT_ID }],
      internalTableNames: [],
    });
  });

  it("returns a bare uuid table as a dataset relation", () => {
    const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
      `SELECT * FROM "${DATASET_ID}"`,
    );

    expect(analysis).toEqual({
      kind: "read",
      relations: [{ kind: "dataset", id: DATASET_ID }],
      internalTableNames: [],
    });
  });

  it("keeps concept tables out of the dataset-only entry point", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT * FROM "${DATASET_ID}" JOIN "concept_${CONCEPT_ID}" ON true`,
      ),
    ).toEqual([DATASET_ID]);
  });

  it("does not interpret strings or quoted identifiers as keywords", () => {
    expect(
      DuckDbSqlAnalyzer.getDatasetIdsFromSqlTableReferences(
        `SELECT 'FROM', "join" FROM "${DATASET_ID}"`,
      ),
    ).toEqual([DATASET_ID]);
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `ALTER TABLE "${DATASET_ID}" ALTER value TYPE VARCHAR USING concat('FROM', "join")`,
      ),
    ).toEqual({
      kind: "mutating",
      readDatasetIds: [],
      mutatedDatasetIds: [DATASET_ID],
    });
  });
  // An `ava_rows_<datasetId>` view reads the dataset's own registered parquet
  // file, so it has to be reported as a read of that dataset. Reporting it as
  // an opaque internal table would let raw SQL reach a dataset the workspace
  // allowlist never authorized, and reporting nothing at all (which is what
  // happened before) refuses the statement outright, which silently disables
  // every `first` value picker.
  it("reads a row-numbered view as a read of the dataset it exposes", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM "ava_rows_${DATASET_ID}" dataset`,
      ),
    ).toEqual({
      kind: "read",
      relations: [{ kind: "dataset", id: DATASET_ID }],
      internalTableNames: [],
    });
  });

  // The positive control for the case above: the prefix alone must not make a
  // name inspectable. Only a real dataset id behind it does.
  it("still refuses a row-numbered name that is not a dataset id", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM "ava_rows_whatever"`,
      ),
    ).toEqual({
      kind: "unsafe",
      reason: "uninspectable-source",
      datasetIds: [],
    });
  });

  // The concept spine is deliberately not a relation name, so a statement that
  // names one cannot be analyzed. That is what forces the concept view's
  // definition to be run as trusted internal SQL, and it is also what stops raw
  // user SQL from reading another workspace's spine out of the shared catalog.
  it("refuses a statement that names a concept spine table", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM "concept_${CONCEPT_ID}__individuals"`,
      ),
    ).toEqual({
      kind: "unsafe",
      reason: "uninspectable-source",
      datasetIds: [],
    });
  });
  // Individual generation stages its rows in `ava_staging_individuals_<id>`
  // and reads that table back through `runRawQuery`, so the analyzer accepts
  // it. It reads no dataset of its own, so it contributes no relation. It is
  // reported by name, so a caller that allows only datasets can refuse it.
  it("reads an individuals staging table as an internal table naming no relation", () => {
    const stagingTableName = `ava_staging_individuals_${CONCEPT_ID}`;

    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM "${stagingTableName}" LIMIT 1000`,
      ),
    ).toEqual({
      kind: "read",
      relations: [],
      internalTableNames: [stagingTableName],
    });
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `DESCRIBE "${stagingTableName}"`,
      ),
    ).toEqual({
      kind: "read",
      relations: [],
      internalTableNames: [stagingTableName],
    });
  });

  it("reports an internal table beside the datasets a statement reads", () => {
    const stagingTableName = `ava_staging_individuals_${CONCEPT_ID}`;

    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM "${DATASET_ID}" JOIN "${stagingTableName}" ON true`,
      ),
    ).toEqual({
      kind: "read",
      relations: [{ kind: "dataset", id: DATASET_ID }],
      internalTableNames: [stagingTableName],
    });
  });

  it("reports the reject tables as internal tables", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM reject_errors`,
      ),
    ).toEqual({
      kind: "read",
      relations: [],
      internalTableNames: ["reject_errors"],
    });
  });

  it("reports an internal table read inside query()", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM query('SELECT * FROM reject_scans')`,
      ),
    ).toEqual({
      kind: "read",
      relations: [],
      internalTableNames: ["reject_scans"],
    });
  });

  // A CTE name, a subquery, and a table function name no table of their own.
  it("reports no internal table for a CTE, a subquery, or a table function", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `WITH recent AS (SELECT * FROM "${DATASET_ID}")
         SELECT * FROM recent JOIN (SELECT 1 AS id FROM range(3)) other ON true`,
      ),
    ).toEqual({
      kind: "read",
      relations: [{ kind: "dataset", id: DATASET_ID }],
      internalTableNames: [],
    });
  });

  it("refuses a staging name whose suffix is not a UUID", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM "ava_staging_individuals_secret"`,
      ),
    ).toEqual({
      kind: "unsafe",
      reason: "uninspectable-source",
      datasetIds: [],
    });
  });

  // The staging table is a bare local table, so a qualified name is something
  // else entirely and must not inherit its exemption.
  it("still refuses a qualified name ending in a staging table name", () => {
    expect(
      DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
        `SELECT * FROM other."ava_staging_individuals_${CONCEPT_ID}"`,
      ),
    ).toEqual({
      kind: "unsafe",
      reason: "uninspectable-source",
      datasetIds: [],
    });
  });

  describe("sources the keyword list used to miss", () => {
    const conceptRelation = { kind: "concept", id: CONCEPT_ID };

    it.each([
      ["TABLE", `SELECT * FROM (TABLE "concept_${CONCEPT_ID}")`],
      [
        "PIVOT_WIDER",
        `SELECT * FROM (PIVOT_WIDER "concept_${CONCEPT_ID}" ON a USING max(a))`,
      ],
      [
        "PIVOT_LONGER",
        `SELECT * FROM (PIVOT_LONGER "concept_${CONCEPT_ID}" ON a INTO NAME n VALUE v)`,
      ],
      ["SHOW", `SHOW "concept_${CONCEPT_ID}"`],
      [
        "TABLE after UNION ALL",
        `SELECT 1 UNION ALL TABLE "concept_${CONCEPT_ID}"`,
      ],
    ])("reads the relation named after %s", (_keyword, sql) => {
      const analysis = DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql);

      expect(JSON.stringify(analysis)).toContain(CONCEPT_ID);
      expect(analysis.kind === "read" ? analysis.relations : []).toEqual(
        analysis.kind === "read" ? [conceptRelation] : [],
      );
    });

    it("reads the dataset named after AS TABLE in a CREATE", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `CREATE TABLE "${DATASET_ID}" AS TABLE "${JOINED_DATASET_ID}"`,
        ),
      ).toEqual({
        kind: "mutating",
        readDatasetIds: [JOINED_DATASET_ID],
        mutatedDatasetIds: [DATASET_ID],
      });
    });

    it("does not read the target of a CREATE, DROP, or ALTER TABLE as a source", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `DROP TABLE IF EXISTS "${DATASET_ID}"`,
        ),
      ).toEqual({
        kind: "mutating",
        readDatasetIds: [],
        mutatedDatasetIds: [DATASET_ID],
      });
    });

    it("refuses SHOW of anything that is not a relation", () => {
      ["SHOW TABLES", "SHOW ALL TABLES"].forEach((sql) => {
        expect(
          DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql),
        ).toMatchObject({ kind: "unsafe", reason: "uninspectable-source" });
      });
    });
  });

  describe("common table expression scope", () => {
    it("reads the real view a CTE of the same name selects from", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH "concept_${CONCEPT_ID}" AS (SELECT * FROM "concept_${CONCEPT_ID}")
           SELECT * FROM "concept_${CONCEPT_ID}"`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "concept", id: CONCEPT_ID }],
        internalTableNames: [],
      });
    });

    it("reads the real staging table a CTE of the same name selects from", () => {
      const stagingTableName = `ava_staging_individuals_${CONCEPT_ID}`;

      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH "${stagingTableName}" AS (SELECT * FROM "${stagingTableName}")
           SELECT * FROM "${stagingTableName}"`,
        ),
      ).toEqual({
        kind: "read",
        relations: [],
        internalTableNames: [stagingTableName],
      });
    });

    it("lets a recursive CTE read its own name", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH RECURSIVE counter(n) AS (
             SELECT 1 UNION ALL SELECT n + 1 FROM counter WHERE n < 3
           ) SELECT * FROM counter`,
        ),
      ).toEqual({ kind: "read", relations: [], internalTableNames: [] });
    });

    it("reads the real view in the base term of a recursive CTE of the same name", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH RECURSIVE "concept_${CONCEPT_ID}" AS (
             SELECT * FROM "concept_${CONCEPT_ID}"
             UNION ALL SELECT a + 1 FROM "concept_${CONCEPT_ID}" WHERE a < 3
           ) SELECT * FROM "concept_${CONCEPT_ID}"`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "concept", id: CONCEPT_ID }],
        internalTableNames: [],
      });
    });

    it("reads the real view in an earlier term of a recursive CTE with several unions", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH RECURSIVE "concept_${CONCEPT_ID}" AS (
             SELECT 1
             UNION ALL SELECT a FROM "concept_${CONCEPT_ID}"
             UNION ALL SELECT a + 1 FROM "concept_${CONCEPT_ID}" WHERE a < 3
           ) SELECT 1`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "concept", id: CONCEPT_ID }],
        internalTableNames: [],
      });
    });

    it("reads the real view when the shadowing CTE is not the first in the list", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH first_cte AS (SELECT 1),
                "concept_${CONCEPT_ID}" AS (SELECT * FROM "concept_${CONCEPT_ID}")
           SELECT * FROM "concept_${CONCEPT_ID}"`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "concept", id: CONCEPT_ID }],
        internalTableNames: [],
      });
    });

    it("lets a later CTE in the list read an earlier one", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH first_cte AS (SELECT * FROM "${DATASET_ID}"),
                second_cte AS (SELECT * FROM first_cte)
           SELECT * FROM second_cte`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "dataset", id: DATASET_ID }],
        internalTableNames: [],
      });
    });

    it("does not treat a WINDOW definition as a CTE", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `SELECT 'x' FROM range(1) WINDOW "concept_${CONCEPT_ID}" AS (ORDER BY 1)
           UNION ALL SELECT a FROM "concept_${CONCEPT_ID}"`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "concept", id: CONCEPT_ID }],
        internalTableNames: [],
      });
    });
  });

  describe("syntax the tokenizer reads differently from DuckDB", () => {
    it.each([
      [
        "a nested block comment",
        `SELECT 1 /* /* */ ' */, (SELECT max(a) FROM "concept_${CONCEPT_ID}") --'`,
      ],
      ["an unterminated block comment", `SELECT 1 /* never closed`],
      ["an unterminated string", `SELECT 'never closed`],
      ["an E string", `SELECT E'\\'', (SELECT 1 FROM x) --'`],
      ["a lowercase E string", `SELECT e'a'`],
      ["dollar quoting", `SELECT $$'$$, (SELECT 1 FROM x) --'`],
      ["tagged dollar quoting", `SELECT $q$'$q$, (SELECT 1 FROM x) --'`],
      ["a positional parameter", `SELECT $1`],
    ])("refuses %s", (_description, sql) => {
      expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql)).toEqual({
        kind: "unsafe",
        reason: "unsupported-syntax",
        datasetIds: [],
      });
    });

    it("ends a line comment at a carriage return", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `SELECT 1 --x\r, (SELECT max(a) FROM "concept_${CONCEPT_ID}")`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "concept", id: CONCEPT_ID }],
        internalTableNames: [],
      });
    });

    it("keeps accepting quotes, escapes, and dollar signs where they are plain text", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `SELECT 'it''s $$ E''x', "a$b", "e", e_col$1, /* a $$ b */ 1
           FROM "${DATASET_ID}" -- $$ E'
           WHERE name = 'E'`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "dataset", id: DATASET_ID }],
        internalTableNames: [],
      });
    });
  });

  describe("statements", () => {
    it.each([
      "PRAGMA threads=1",
      "USE other_db",
      "PREPARE q AS SELECT 1",
      "EXECUTE q",
      "DEALLOCATE q",
      "CHECKPOINT",
      "FORCE CHECKPOINT",
      "BEGIN TRANSACTION",
      "COMMIT",
      "ROLLBACK",
      "SELECT 1; PRAGMA threads=1",
      "SELECT 1; COMMIT",
    ])("refuses %s", (sql) => {
      expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql)).toMatchObject({
        kind: "unsafe",
      });
    });

    it("refuses a later statement that is not a read", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `SELECT 1; TABLE "concept_${CONCEPT_ID}"`,
        ),
      ).toMatchObject({ kind: "unsafe", reason: "invalid-sql" });
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(`SELECT 1; WHATEVER x`),
      ).toMatchObject({ kind: "unsafe", reason: "invalid-sql" });
    });

    it("keeps reading a column named like a transaction keyword", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `SELECT begin, commit, "use", execute FROM "${DATASET_ID}"`,
        ),
      ).toEqual({
        kind: "read",
        relations: [{ kind: "dataset", id: DATASET_ID }],
        internalTableNames: [],
      });
    });

    it.each([
      ["a SELECT", "SELECT 1", true],
      ["a trailing semicolon", "SELECT 1;", true],
      ["a WITH", "WITH a AS (SELECT 1) SELECT * FROM a", true],
      ["FROM first", "FROM t SELECT a", true],
      ["a parenthesis", "(SELECT 1)", true],
      ["two statements", "SELECT 1; SELECT 2", false],
      ["TABLE", "TABLE t", false],
      ["SHOW", "SHOW TABLES", false],
      ["DESCRIBE", "DESCRIBE t", false],
      ["PRAGMA", "PRAGMA threads=1", false],
      ["nothing", "", false],
      ["unsupported syntax", "SELECT $$a$$", false],
    ])(
      "reports whether %s is one plain query",
      (_description, sql, expected) => {
        expect(DuckDbSqlAnalyzer.isSinglePlainQuery(sql)).toBe(expected);
      },
    );
  });

  describe("only symbols are structure", () => {
    const conceptView = `"concept_${CONCEPT_ID}"`;
    const readsConcept = {
      kind: "read",
      relations: [{ kind: "concept", id: CONCEPT_ID }],
      internalTableNames: [],
    };

    it.each([
      [
        "a string paren inside trim",
        `SELECT trim(BOTH FROM '(') AS t, a FROM ${conceptView} WHERE ')' <> ''`,
      ],
      [
        "a quoted paren name",
        `SELECT "(" FROM ${conceptView} WHERE ")" IS NULL`,
      ],
      [
        "a string paren beside a shadowed CTE name",
        `SELECT * FROM (WITH ${conceptView} AS (SELECT 1 AS a)
           SELECT * FROM ${conceptView} WHERE '(' <> 'x') t
         JOIN ${conceptView} c ON true WHERE ')' <> 'y'`,
      ],
      ["a string semicolon", `SELECT ';' AS s FROM ${conceptView}`],
      [
        "a string comma after a join",
        `SELECT ',' AS s FROM range(1) r JOIN range(1) s ON true, ${conceptView}`,
      ],
      [
        "a string dot",
        `SELECT * FROM range(1) a, ${conceptView} b WHERE '.' <> 'x'`,
      ],
    ])("still reads the view past %s", (_description, sql) => {
      expect(DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql)).toEqual(
        readsConcept,
      );
    });

    it("does not treat a string semicolon as a second statement", () => {
      expect(DuckDbSqlAnalyzer.isSinglePlainQuery(`SELECT ';' AS s`)).toBe(
        true,
      );
      expect(DuckDbSqlAnalyzer.isSinglePlainQuery(`SELECT 1; SELECT 2`)).toBe(
        false,
      );
    });
  });

  describe("joins and recursive CTEs", () => {
    const conceptView = `"concept_${CONCEPT_ID}"`;
    const readsConcept = {
      kind: "read",
      relations: [{ kind: "concept", id: CONCEPT_ID }],
      internalTableNames: [],
    };

    it.each([
      ["EXCEPT", "SELECT 'x' AS a UNION SELECT * FROM V EXCEPT SELECT 'y'"],
      [
        "INTERSECT",
        "SELECT 'x' AS a UNION SELECT * FROM V INTERSECT SELECT 'y'",
      ],
    ])(
      "reads the real view when a recursive CTE has %s after its UNION",
      (_operator, bodyTemplate) => {
        const body = bodyTemplate.replace("V", conceptView);

        expect(
          DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
            `WITH RECURSIVE ${conceptView} AS (${body}) SELECT * FROM ${conceptView}`,
          ),
        ).toEqual(readsConcept);
      },
    );

    it("still lets a recursive CTE read itself after a UNION", () => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          `WITH RECURSIVE counter(n) AS (
             SELECT 1 UNION SELECT n + 1 FROM counter WHERE n < 3
           ) SELECT * FROM counter`,
        ),
      ).toEqual({ kind: "read", relations: [], internalTableNames: [] });
    });

    it.each([
      ["a parenthesized join", `SELECT * FROM (V CROSS JOIN range(1))`],
      [
        "a nested parenthesized join",
        `SELECT * FROM ((V CROSS JOIN range(1)) x)`,
      ],
      [
        "a join inside parentheses",
        `SELECT * FROM range(1) a JOIN (V JOIN range(1) ON true) ON true`,
      ],
      [
        "a comma after a join condition",
        `SELECT * FROM range(1) r JOIN range(1) s ON true, V`,
      ],
      [
        "a comma after a CASE in a join condition",
        `SELECT * FROM range(1) r JOIN range(1) s ON CASE WHEN true THEN true END, V`,
      ],
    ])("reads the view named in %s", (_description, sqlTemplate) => {
      expect(
        DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(
          sqlTemplate.replace("V", conceptView),
        ),
      ).toEqual(readsConcept);
    });

    it("still ends the source list at ON CONFLICT, WHEN of a MERGE, and PIVOT ON", () => {
      [
        `INSERT INTO "${DATASET_ID}" SELECT * FROM "${JOINED_DATASET_ID}" ON CONFLICT (id) DO UPDATE SET a = 1, b = 2`,
        `MERGE INTO "${DATASET_ID}" USING "${JOINED_DATASET_ID}" ON true WHEN MATCHED THEN UPDATE SET a = 1, b = 2`,
        `PIVOT "${DATASET_ID}" ON a, b USING sum(c)`,
      ].forEach((sql) => {
        expect(
          DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(sql),
        ).not.toMatchObject({ kind: "unsafe" });
      });
    });
  });
});
