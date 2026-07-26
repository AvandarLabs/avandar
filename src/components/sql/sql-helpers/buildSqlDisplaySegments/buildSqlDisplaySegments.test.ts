import { buildSqlDisplaySegments } from "@/components/sql/sql-helpers/buildSqlDisplaySegments/buildSqlDisplaySegments";
import { describe, expect, it } from "vitest";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DS_ID = "00000000-0000-4000-8000-000000000001" as DatasetId;

const catalog: SqlDisplayCatalog = {
  datasets: [
    {
      id: DS_ID,
      name: "California cases",
      columns: [{ name: "Admin2" }, { name: "daily_new_cases" }],
    },
  ],
};

function segmentKinds(
  segments: ReturnType<typeof buildSqlDisplaySegments>,
): string[] {
  return segments.map((s) => {
    return s.kind;
  });
}

describe("buildSqlDisplaySegments", () => {
  it("returns a single text segment for empty SQL", () => {
    expect(buildSqlDisplaySegments({ sql: "", catalog })).toEqual([
      { kind: "text", value: "" },
    ]);
  });

  it("labels a quoted dataset id with the dataset name", () => {
    const sql = `SELECT * FROM "${DS_ID}" LIMIT 10`;
    const segments = buildSqlDisplaySegments({ sql, catalog });
    const dataset = segments.find((s) => {
      return s.kind === "dataset";
    });
    expect(dataset).toMatchObject({
      kind: "dataset",
      datasetId: DS_ID,
      label: "California cases",
      raw: `"${DS_ID}"`,
    });
    expect(segmentKinds(segments)).toContain("text");
  });

  it("labels quoted column identifiers as column segments", () => {
    const sql =
      `SELECT "Admin2", SUM("daily_new_cases")::DOUBLE AS total ` +
      `FROM "${DS_ID}" GROUP BY "Admin2"`;
    const segments = buildSqlDisplaySegments({ sql, catalog });
    const columns = segments.filter((s) => {
      return s.kind === "column";
    });
    expect(columns.length).toBeGreaterThanOrEqual(2);
    expect(
      columns.some((c) => {
        return c.kind === "column" && c.name === "Admin2";
      }),
    ).toBe(true);
    expect(
      columns.some((c) => {
        return c.kind === "column" && c.name === "daily_new_cases";
      }),
    ).toBe(true);
  });

  it("does not treat unknown quoted strings as datasets or columns", () => {
    const sql = `SELECT "unknown_col" FROM "${DS_ID}"`;
    const segments = buildSqlDisplaySegments({
      sql,
      catalog: {
        datasets: [
          {
            id: DS_ID,
            name: "Cases",
            columns: [{ name: "Admin2" }],
          },
        ],
      },
    });
    const unknownColumn = segments.find((s) => {
      return s.kind === "column" && s.name === "unknown_col";
    });
    expect(unknownColumn).toBeUndefined();
    expect(
      segments.some((s) => {
        return s.kind === "text" && s.value.includes('"unknown_col"');
      }),
    ).toBe(true);
  });

  it("reconstructs the original SQL when segment values are concatenated", () => {
    const sql = `SELECT "Admin2" FROM "${DS_ID}" WHERE "daily_new_cases" > 0`;
    const segments = buildSqlDisplaySegments({ sql, catalog });
    const rebuilt = segments
      .map((s) => {
        return s.kind === "text" ? s.value : s.raw;
      })
      .join("");
    expect(rebuilt).toBe(sql);
  });

  it("labels a backtick-quoted dataset id (e.g. after sqlify formatting)", () => {
    const sql = `SELECT "Admin2" FROM \`${DS_ID}\` LIMIT 10`;
    const segments = buildSqlDisplaySegments({ sql, catalog });
    expect(
      segments.some((s) => {
        return (
          s.kind === "dataset" &&
          s.datasetId === DS_ID &&
          s.label === "California cases" &&
          s.raw === `\`${DS_ID}\``
        );
      }),
    ).toBe(true);
  });

  it("resolves dataset by name when SQL uses the dataset name in FROM", () => {
    const sql = `SELECT * FROM "California cases"`;
    const segments = buildSqlDisplaySegments({ sql, catalog });
    expect(
      segments.some((s) => {
        return (
          s.kind === "dataset" &&
          s.datasetId === DS_ID &&
          s.label === "California cases"
        );
      }),
    ).toBe(true);
  });
});
