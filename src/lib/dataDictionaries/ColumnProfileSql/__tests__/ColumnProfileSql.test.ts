import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import { ColumnProfileSql } from "@/lib/dataDictionaries/ColumnProfileSql/ColumnProfileSql";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET = { id: uuid<Dataset.Id>(), name: "Bronx line list" };

describe("ColumnProfileSql", () => {
  it("quotes hostile dataset and column names", () => {
    const sql = ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: [{ name: 'a"b', dataType: "bigint" }],
    });
    expect(sql).toContain('count("a""b") AS "non_null_0"');
    expect(sql).toContain(`FROM "${DATASET.id}"`);
  });

  it("tries text columns as dates and takes number columns' ranges", () => {
    const sql = ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: [
        { name: "onset", dataType: "varchar" },
        { name: "age", dataType: "bigint" },
        { name: "reported", dataType: "date" },
      ],
    });
    expect(sql).toContain('try_strptime("onset"');
    expect(sql).toContain('count("onset") AS "sampled_0"');
    expect(sql).toContain('CAST(min("age") AS DOUBLE) AS "min_1"');
    expect(sql).not.toContain('"dates_2"');
    expect(sql).not.toContain('"min_2"');
  });

  it("takes the date share from a sample and keeps the other counts exact", () => {
    const sql = ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: [
        { name: "onset", dataType: "varchar" },
        { name: "age", dataType: "bigint" },
      ],
    });
    expect(sql).toContain("USING SAMPLE reservoir(10000 ROWS) REPEATABLE (42)");
    const [exactPart = "", samplePart = ""] = sql.split("CROSS JOIN");
    expect(samplePart).toContain("try_strptime");
    expect(samplePart).toContain('FROM "sample"');
    expect(exactPart).not.toContain("try_strptime");
    expect(exactPart).toContain('count(*) AS "row_count"');
    expect(exactPart).toContain('CAST(min("age") AS DOUBLE)');
  });

  it("omits the sample when no column is text", () => {
    const sql = ColumnProfileSql.buildSummarySql({
      datasetId: DATASET.id,
      columns: [{ name: "age", dataType: "bigint" }],
    });
    expect(sql).not.toContain("SAMPLE");
  });

  it("lists only short columns of a type that can hold codes", () => {
    const indexes = ColumnProfileSql.getListedColumnIndexes({
      columns: [
        { name: "GENDER", dataType: "bigint" },
        { name: "notes", dataType: "varchar" },
        { name: "reported", dataType: "date" },
      ],
      summaryRow: { distinct_0: 3n, distinct_1: 500n, distinct_2: 2n },
    });
    expect([...indexes]).toEqual([0]);
  });

  it("drops a column's values when it turns out to have more than 50", () => {
    const valueRows = Array.from({ length: 51 }, (_unused, index) => {
      return { column_index: 0, value: `v${index}`, row_count: 1n };
    });
    const [profile] = ColumnProfileSql.makeColumnProfilesFromRows({
      dataset: DATASET,
      columns: [{ name: "county", dataType: "varchar" }],
      summaryRow: { row_count: 60n, non_null_0: 60n, distinct_0: 55n },
      valueRows,
      listedColumnIndexes: new Set([0]),
    });
    expect(profile?.values).toBeUndefined();
    expect(profile?.distinctCount).toBe(55);
  });

  it("reads counts that come back as bigints and turns dates into a share", () => {
    const [profile] = ColumnProfileSql.makeColumnProfilesFromRows({
      dataset: DATASET,
      columns: [{ name: "onset", dataType: "varchar" }],
      summaryRow: {
        row_count: 10n,
        non_null_0: 8n,
        distinct_0: 8n,
        sampled_0: 4n,
        dates_0: 3n,
      },
      valueRows: [],
      listedColumnIndexes: new Set(),
    });
    expect(profile).toMatchObject({
      datasetId: DATASET.id,
      datasetName: "Bronx line list",
      rowCount: 10,
      nonNullCount: 8,
      dateShare: 0.75,
      values: undefined,
    });
  });
});
