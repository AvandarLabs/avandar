import { describe, expect, it } from "vitest";
import { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/requiresOriginalFileRetention.ts";

describe("requiresOriginalFileRetention", () => {
  it("returns false for source types reconstructable from the parquet blob", () => {
    // A CSV's every byte of meaning is in the parquet plus the parse
    // options, so retaining the original would be dead weight.
    expect(requiresOriginalFileRetention("csv_file")).toBe(false);
    expect(requiresOriginalFileRetention("xlsx_file")).toBe(false);
  });

  it("returns true for pdf_file, whose extraction is lossy", () => {
    // Only the extracted table reaches the parquet. Everything else in the
    // document is gone, so the original has to survive.
    expect(requiresOriginalFileRetention("pdf_file")).toBe(true);
  });

  it("returns false for source types with no uploaded file at all", () => {
    expect(requiresOriginalFileRetention("google_sheets")).toBe(false);
    expect(requiresOriginalFileRetention("open_data")).toBe(false);
    expect(requiresOriginalFileRetention("virtual")).toBe(false);
  });
});
