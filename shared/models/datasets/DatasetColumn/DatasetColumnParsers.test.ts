import { describe, expect, it } from "vitest";
import { DatasetColumnParsers } from "$/models/datasets/DatasetColumn/DatasetColumn.ts";

const ROW = {
  column_idx: 0,
  created_at: "2026-11-13T10:00:00+00:00",
  data_type: "varchar" as const,
  dataset_id: "22222222-2222-4222-8222-222222222222",
  description: null,
  detected_data_type: "BIGINT" as const,
  dictionary_binding_id: null,
  id: "11111111-1111-4111-8111-111111111111",
  name: "GENDER",
  original_data_type: "BIGINT",
  original_name: "GENDER",
  updated_at: "2026-11-13T10:00:00+00:00",
  workspace_id: "66666666-6666-4666-8666-666666666666",
};

describe("DatasetColumnParsers", () => {
  it("reads an ordinary column with no keep-original binding", () => {
    expect(
      DatasetColumnParsers.fromDBReadToModelRead(ROW).dictionaryBindingId,
    ).toBeUndefined();
  });

  it("reads the binding that keeps a `<column>_original` copy", () => {
    const column = DatasetColumnParsers.fromDBReadToModelRead({
      ...ROW,
      name: "GENDER_original",
      dictionary_binding_id: "55555555-5555-4555-8555-555555555555",
    });

    expect(column.dictionaryBindingId).toBe(
      "55555555-5555-4555-8555-555555555555",
    );
    expect(column.originalName).toBe("GENDER");
  });
});
