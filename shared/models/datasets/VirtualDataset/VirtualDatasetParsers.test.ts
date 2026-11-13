import { describe, expect, it } from "vitest";
import { VirtualDatasetParsers } from "$/models/datasets/VirtualDataset/VirtualDatasetParsers.ts";

const ROW = {
  created_at: "2026-11-13T10:00:00+00:00",
  dataset_id: "22222222-2222-4222-8222-222222222222",
  id: "11111111-1111-4111-8111-111111111111",
  is_places: false,
  linked_source_dataset_id: null,
  raw_sql: 'SELECT * FROM "33333333-3333-4333-8333-333333333333"',
  updated_at: "2026-11-13T10:00:00+00:00",
  workspace_id: "66666666-6666-4666-8666-666666666666",
};

describe("VirtualDatasetParsers", () => {
  it("reads a virtual dataset that is not linked", () => {
    expect(
      VirtualDatasetParsers.fromDBReadToModelRead(ROW).linkedSourceDatasetId,
    ).toBeUndefined();
  });

  it("reads the source a linked dataset converts", () => {
    const virtualDataset = VirtualDatasetParsers.fromDBReadToModelRead({
      ...ROW,
      linked_source_dataset_id: "33333333-3333-4333-8333-333333333333",
    });

    expect(virtualDataset.linkedSourceDatasetId).toBe(
      "33333333-3333-4333-8333-333333333333",
    );
    expect(virtualDataset.rawSql).toBe(ROW.raw_sql);
  });
});
