import { PdfFileDatasetParsers } from "$/models/datasets/PdfFileDataset/PdfFileDatasetParsers.ts";
import { describe, expect, it } from "vitest";
import type { PdfFileDatasetModel } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types.ts";

const validRow: PdfFileDatasetModel["DBRead"] = {
  id: "00000000-0000-4000-8000-000000000001",
  dataset_id: "00000000-0000-4000-8000-000000000002",
  workspace_id: "00000000-0000-4000-8000-000000000003",
  created_at: "2026-08-17T00:00:00.000Z",
  updated_at: "2026-08-17T00:00:00.000Z",
  is_in_cloud_storage: true,
  size_in_bytes: 1024,
  has_original_file: true,
  regions: [
    {
      id: "r1",
      label: "Cases by district",
      shape: "grid_table",
      detectionMode: "lattice",
      fragments: [{ page: 4, bbox: [0, 0, 100, 200] }],
      options: { headerRows: 1, fillMergedCells: true },
    },
  ],
  output_mode: "natural",
  llm_model: null,
  page_range_start: 4,
  page_range_end: 9,
  fingerprint: { headers: ["a", "b"], shape: [10, 2], hash: "abc123" },
};

describe("PdfFileDatasetParsers", () => {
  it("parses a well-formed DB row into the expected model", () => {
    const model = PdfFileDatasetParsers.fromDBReadToModelRead(validRow);

    expect(model.pageRangeStart).toBe(4);
    expect(model.pageRangeEnd).toBe(9);
    expect(typeof model.pageRangeStart).toBe("number");
    expect(typeof model.pageRangeEnd).toBe("number");
    expect(model.outputMode).toBe("natural");
    expect(model.llmModel).toBeUndefined();
    expect(model.regions).toEqual([
      {
        id: "r1",
        label: "Cases by district",
        shape: "grid_table",
        detectionMode: "lattice",
        fragments: [{ page: 4, bbox: [0, 0, 100, 200] }],
        options: { headerRows: 1, fillMergedCells: true },
      },
    ]);
    expect(model.fingerprint).toEqual({
      headers: ["a", "b"],
      shape: [10, 2],
      hash: "abc123",
    });
  });

  it("throws when a region is missing its bbox", () => {
    expect(() => {
      PdfFileDatasetParsers.fromDBReadToModelRead({
        ...validRow,
        regions: [
          {
            id: "r1",
            label: "x",
            shape: "grid_table",
            detectionMode: "manual",
            fragments: [{ page: 4 }],
            options: {},
          },
        ],
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

describe("PdfFileDataset region parsing", () => {
  it("parses a multi-region row into camelCase regions", () => {
    const parsed = PdfFileDatasetParsers.fromDBReadToModelRead({
      ...validRow,
      output_mode: "observations",
      llm_model: null,
      page_range_start: null,
      page_range_end: null,
      fingerprint: { headers: ["state"], shape: [16, 2], hash: "abc" },
      regions: [
        {
          id: "r1",
          label: "Deaths by state",
          shape: "labelled_graphic",
          detectionMode: "manual",
          fragments: [{ page: 0, bbox: [330, 175, 590, 465] }],
          options: { ambiguityThreshold: 0.8 },
        },
        {
          id: "r2",
          label: "Headline figures",
          shape: "repeating_blocks",
          detectionMode: "stream",
          fragments: [{ page: 1, bbox: [40, 600, 555, 700] }],
          options: {},
        },
      ],
    });

    expect(parsed.outputMode).toBe("observations");
    expect(parsed.llmModel).toBeUndefined();
    expect(parsed.regions).toHaveLength(2);
    expect(parsed.regions[0]!.shape).toBe("labelled_graphic");
    expect(parsed.regions[0]!.fragments[0]!.bbox).toEqual([330, 175, 590, 465]);
    expect(parsed.regions[1]!.shape).toBe("repeating_blocks");
  });

  it("keeps the model name of the model that extracted the rows", () => {
    const parsed = PdfFileDatasetParsers.fromDBReadToModelRead({
      ...validRow,
      llm_model: "anthropic/claude-sonnet-4",
    });

    expect(parsed.llmModel).toBe("anthropic/claude-sonnet-4");
  });

  it("rejects a region with an unknown shape", () => {
    // A shape we do not have an extractor for must fail loudly at the
    // boundary rather than reaching a `match` that throws at extraction time.
    expect(() => {
      PdfFileDatasetParsers.fromDBReadToModelRead({
        ...validRow,
        regions: [
          {
            id: "r1",
            label: "x",
            shape: "sideways",
            detectionMode: "manual",
            fragments: [],
            options: {},
          },
        ],
      });
    }).toThrow();
  });

  it("rejects a region with an unknown detection mode", () => {
    expect(() => {
      PdfFileDatasetParsers.fromDBReadToModelRead({
        ...validRow,
        regions: [
          {
            id: "r1",
            label: "x",
            shape: "grid_table",
            detectionMode: "telepathy",
            fragments: [],
            options: {},
          },
        ],
      });
    }).toThrow();
  });

  it("defaults a region's options to an empty object when absent", () => {
    const parsed = PdfFileDatasetParsers.fromDBReadToModelRead({
      ...validRow,
      regions: [
        {
          id: "r1",
          label: "x",
          shape: "grid_table",
          detectionMode: "manual",
          fragments: [],
        },
      ],
    });

    expect(parsed.regions[0]!.options).toEqual({});
  });
});
