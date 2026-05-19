import { describe, expect, it } from "vitest";
import {
  buildSliceSql,
  extractReferencedColumns,
  readDashboardPublishConfig,
  writeDashboardPublishConfig,
} from "@/clients/dashboards/sliceBuilder";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

const DS_A = "00000000-0000-4000-8000-000000000001" as DatasetId;
const DS_B = "00000000-0000-4000-8000-000000000002" as DatasetId;

describe("buildSliceSql", () => {
  it("projects queried columns by default and ignores unknown ones", () => {
    const sql = buildSliceSql({
      baseSelectExpr: 'SELECT * FROM "ds"',
      sliceConfig: { mode: "queried" },
      availableColumns: ["a", "b", "c"],
      queriedColumns: ["a", "c", "ghost"],
      treatAsAllColumns: false,
    });
    expect(sql).toBe('SELECT "a", "c" FROM (SELECT * FROM "ds") AS _ava_slice');
  });

  it("falls back to SELECT * when queried column list is empty", () => {
    const sql = buildSliceSql({
      baseSelectExpr: 'SELECT * FROM "ds"',
      sliceConfig: { mode: "queried" },
      availableColumns: ["a"],
      queriedColumns: [],
      treatAsAllColumns: false,
    });
    expect(sql).toBe('SELECT * FROM (SELECT * FROM "ds") AS _ava_slice');
  });

  it("treats SELECT * referenced datasets as all-columns regardless of slice", () => {
    const sql = buildSliceSql({
      baseSelectExpr: 'SELECT * FROM "ds"',
      sliceConfig: {
        mode: "custom",
        columns: ["a"],
        rowFilters: [],
      },
      availableColumns: ["a", "b"],
      queriedColumns: [],
      treatAsAllColumns: true,
    });
    expect(sql).toContain("SELECT *");
  });

  it("composes enum, number range and date range row filters", () => {
    const sql = buildSliceSql({
      baseSelectExpr: 'SELECT * FROM "ds"',
      sliceConfig: {
        mode: "custom",
        columns: ["province", "cases", "date"],
        rowFilters: [
          {
            kind: "enum",
            columnName: "province",
            values: ["Lusaka", "Copperbelt"],
          },
          { kind: "range_number", columnName: "cases", min: 5, max: 1000 },
          {
            kind: "range_date",
            columnName: "date",
            start: "2024-01-01",
            end: "2024-12-31",
          },
        ],
      },
      availableColumns: ["province", "cases", "date"],
      queriedColumns: ["province"],
      treatAsAllColumns: false,
    });
    expect(sql).toContain("\"province\" IN ('Lusaka', 'Copperbelt')");
    expect(sql).toContain('"cases" >= 5 AND "cases" <= 1000');
    expect(sql).toContain(`"date" >= '2024-01-01' AND "date" <= '2024-12-31'`);
  });

  it("skips row filters whose column does not exist on the dataset", () => {
    const sql = buildSliceSql({
      baseSelectExpr: 'SELECT * FROM "ds"',
      sliceConfig: {
        mode: "custom",
        columns: ["a"],
        rowFilters: [{ kind: "enum", columnName: "ghost", values: ["x"] }],
      },
      availableColumns: ["a"],
      queriedColumns: [],
      treatAsAllColumns: false,
    });
    expect(sql).not.toContain("WHERE");
  });
});

describe("extractReferencedColumns", () => {
  it("collects column references from DataViz SQL and FilterPBlock targets", () => {
    const config = {
      root: { props: {} },
      content: [
        {
          type: "DataViz",
          props: {
            nlQuery: {
              prompt: "",
              rawSql: `SELECT province, COUNT(*) AS n FROM "${DS_A}" GROUP BY province`,
            },
          },
        },
        {
          type: "Filter",
          props: {
            filterId: "f1",
            label: "Province",
            columnName: "province",
          },
        },
      ],
    };

    const { perDataset, unparseable } = extractReferencedColumns(config, [
      DS_A,
      DS_B,
    ]);
    expect(unparseable.has(DS_A)).toBe(false);
    expect(perDataset[DS_A]?.has("province")).toBe(true);
    // FilterPBlock targets propagate to every dataset (conservative).
    expect(perDataset[DS_B]?.has("province")).toBe(true);
  });

  it("marks SELECT * queries as unparseable so all columns get published", () => {
    const config = {
      root: { props: {} },
      content: [
        {
          type: "DataViz",
          props: {
            nlQuery: {
              prompt: "",
              rawSql: `SELECT * FROM "${DS_A}"`,
            },
          },
        },
      ],
    };
    const { unparseable } = extractReferencedColumns(config, [DS_A]);
    expect(unparseable.has(DS_A)).toBe(true);
  });
});

describe("readDashboardPublishConfig / writeDashboardPublishConfig", () => {
  it("round-trips through the dashboard config blob", () => {
    const original = { root: { props: {} }, content: [] };
    const cfg = { slices: { [DS_A]: { mode: "queried" as const } } };
    const written = writeDashboardPublishConfig(original, cfg);
    expect(readDashboardPublishConfig(written)).toEqual(cfg);
  });

  it("returns an empty slices map when nothing is persisted", () => {
    expect(readDashboardPublishConfig({})).toEqual({ slices: {} });
    expect(readDashboardPublishConfig(null)).toEqual({ slices: {} });
  });
});
