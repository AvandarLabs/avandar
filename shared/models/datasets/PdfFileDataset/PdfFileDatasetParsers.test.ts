import { describe, expect, it } from "vitest";
import { PdfFileDatasetParsers } from "./PdfFileDatasetParsers.ts";
import type { PdfFileDatasetModel } from "./PdfFileDataset.types.ts";

const validRow: PdfFileDatasetModel["DBRead"] = {
  id: "00000000-0000-4000-8000-000000000001",
  dataset_id: "00000000-0000-4000-8000-000000000002",
  workspace_id: "00000000-0000-4000-8000-000000000003",
  created_at: "2026-08-17T00:00:00.000Z",
  updated_at: "2026-08-17T00:00:00.000Z",
  is_in_cloud_storage: true,
  size_in_bytes: 1024,
  has_original_file: true,
  regions: [{ page: 4, bbox: [0, 0, 100, 200] }],
  detection_mode: "lattice",
  grid_x: [0, 50, 100],
  grid_y: [0, 100, 200],
  page_range_start: 4,
  page_range_end: 9,
  header_rows: 1,
  fill_merged_cells: true,
  fingerprint: { headers: ["a", "b"], shape: [10, 2], hash: "abc123" },
};

describe("PdfFileDatasetParsers", () => {
  it("parses a well-formed DB row into the expected model", () => {
    const model = PdfFileDatasetParsers.fromDBReadToModelRead(validRow);

    expect(model.pageRangeStart).toBe(4);
    expect(model.pageRangeEnd).toBe(9);
    expect(typeof model.pageRangeStart).toBe("number");
    expect(typeof model.pageRangeEnd).toBe("number");
    expect(model.regions).toEqual([{ page: 4, bbox: [0, 0, 100, 200] }]);
    expect(model.fingerprint).toEqual({
      headers: ["a", "b"],
      shape: [10, 2],
      hash: "abc123",
    });
    expect(model.gridX).toEqual([0, 50, 100]);
    expect(model.gridY).toEqual([0, 100, 200]);
  });

  it("yields undefined for grid_x/grid_y when null (e.g. tagged tables)", () => {
    const model = PdfFileDatasetParsers.fromDBReadToModelRead({
      ...validRow,
      detection_mode: "tagged",
      grid_x: null,
      grid_y: null,
    });

    expect(model.gridX).toBeUndefined();
    expect(model.gridY).toBeUndefined();
  });

  it("throws when a region is missing its bbox", () => {
    expect(() => {
      PdfFileDatasetParsers.fromDBReadToModelRead({
        ...validRow,
        regions: [{ page: 4 }],
      });
    }).toThrow();
  });

  it("throws when the fingerprint is missing its hash", () => {
    expect(() => {
      PdfFileDatasetParsers.fromDBReadToModelRead({
        ...validRow,
        fingerprint: { headers: ["a", "b"], shape: [10, 2] },
      });
    }).toThrow();
  });
});
