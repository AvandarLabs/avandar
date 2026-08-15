/** Tests dataset dependency extraction from SQL table references. */

import { describe, expect, it } from "vitest";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

const DATASET_ID = "22222222-2222-4222-8222-222222222222";
const JOINED_DATASET_ID = "33333333-3333-4333-8333-333333333333";
const LITERAL_ID = "44444444-4444-4444-8444-444444444444";

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
});
