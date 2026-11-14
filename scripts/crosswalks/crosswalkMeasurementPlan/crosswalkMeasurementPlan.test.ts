import { describe, expect, it } from "vitest";
import {
  buildMeasurementDatasets,
  buildMeasurementSaveParams,
  buildParquetSql,
  MEASUREMENT_DATASET_COUNT,
  MEASUREMENT_LAYOUTS,
  toDatasetColumnInputs,
} from "./crosswalkMeasurementPlan";

function _counter(): () => string {
  let count = 0;
  return () => {
    count += 1;
    return `00000000-0000-4000-8000-${String(count).padStart(12, "0")}`;
  };
}

describe("crosswalkMeasurementPlan", () => {
  it("seeds 100 datasets across three layouts, most in the reference", () => {
    const datasets = buildMeasurementDatasets(_counter());

    expect(datasets).toHaveLength(MEASUREMENT_DATASET_COUNT);
    expect(
      MEASUREMENT_LAYOUTS.map((layout) => {
        return datasets.filter((dataset) => {
          return dataset.layoutKey === layout.key;
        }).length;
      }),
    ).toEqual([50, 35, 15]);
    expect(datasets[0]?.name).toBe("Crosswalk measurement kings 01");
    expect(
      new Set(
        datasets.map((dataset) => {
          return dataset.id;
        }),
      ).size,
    ).toBe(100);
  });

  it("writes one Parquet file per layout with each column typed", () => {
    const sql = buildParquetSql({
      layout: MEASUREMENT_LAYOUTS[1]!,
      rowCount: 3,
      outputPath: "/tmp/it's here.parquet",
    });

    expect(sql).toMatch(/^COPY \(SELECT CAST\(i AS BIGINT\) AS "CaseNo", /);
    expect(sql).toContain("FROM range(3) AS t(i)");
    expect(sql).toMatch(/TO '\/tmp\/it''s here\.parquet' \(FORMAT parquet\)$/);
  });

  it("describes each column to the dataset RPC by its DuckDB and Ava types", () => {
    expect(toDatasetColumnInputs(MEASUREMENT_LAYOUTS[1]!)[3]).toEqual({
      original_name: "zip",
      name: "zip",
      description: null,
      original_data_type: "BIGINT",
      detected_data_type: "BIGINT",
      data_type: "bigint",
      column_idx: 3,
    });
  });

  it("maps every layout onto every column, with one mapped reference", () => {
    const makeId = _counter();
    const datasets = buildMeasurementDatasets(makeId);
    const params = buildMeasurementSaveParams({
      crosswalkId: makeId(),
      datasets,
      makeId,
    });

    const referenceLayouts = params.p_layouts.filter((layout) => {
      return layout.is_reference;
    });
    expect(referenceLayouts).toHaveLength(1);
    expect(
      new Set(
        params.p_layouts.map((layout) => {
          return layout.signature;
        }),
      ).size,
    ).toBe(3);
    expect(params.p_mappings).toHaveLength(3 * params.p_columns.length);
    expect(params.p_datasets).toHaveLength(100);
    const layoutIds = new Set(
      params.p_layouts.map((layout) => {
        return layout.id;
      }),
    );
    const columnIds = new Set(
      params.p_columns.map((column) => {
        return column.id;
      }),
    );
    params.p_mappings.forEach((mapping) => {
      expect(layoutIds.has(mapping.layout_id)).toBe(true);
      expect(columnIds.has(mapping.column_id)).toBe(true);
      expect(mapping.fill).toMatchObject({ version: 1 });
    });
  });

  it("converts the Queens layout's dates, pads its ZIP codes, and fixes its county", () => {
    const makeId = _counter();
    const params = buildMeasurementSaveParams({
      crosswalkId: makeId(),
      datasets: buildMeasurementDatasets(makeId),
      makeId,
    });
    const queens = params.p_layouts.find((layout) => {
      return layout.column_names.includes("onset_dt");
    })!;
    const fills = params.p_mappings
      .filter((mapping) => {
        return mapping.layout_id === queens.id;
      })
      .map((mapping) => {
        return mapping.fill;
      });

    expect(fills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_column: "onset_dt",
          convert: { kind: "parse_date", format: "%m/%d/%Y" },
        }),
        expect.objectContaining({
          source_column: "zip",
          convert: { kind: "pad_text", length: 5 },
        }),
        expect.objectContaining({ kind: "constant", value: "Queens" }),
      ]),
    );
  });
});
