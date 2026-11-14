import { describe, expect, it } from "vitest";
import { CrosswalkColumnParsers } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.ts";

const ROW = {
  created_at: "2026-11-14T10:00:00+00:00",
  crosswalk_id: "11111111-1111-4111-8111-111111111111",
  data_type: "varchar" as const,
  entry_id: null,
  id: "22222222-2222-4222-8222-222222222222",
  name: "sex",
  position: 1,
  updated_at: "2026-11-14T10:00:00+00:00",
  workspace_id: "44444444-4444-4444-8444-444444444444",
};

describe("CrosswalkColumnParsers", () => {
  it("reads a column no dictionary entry governs", () => {
    const column = CrosswalkColumnParsers.fromDBReadToModelRead(ROW);

    expect(column.entryId).toBeUndefined();
    expect(column.dataType).toBe("varchar");
    expect(column.position).toBe(1);
  });

  it("reads the entry that governs a coded column", () => {
    const column = CrosswalkColumnParsers.fromDBReadToModelRead({
      ...ROW,
      entry_id: "55555555-5555-4555-8555-555555555555",
    });

    expect(column.entryId).toBe("55555555-5555-4555-8555-555555555555");
  });

  it("writes a removed entry as null", () => {
    expect(
      CrosswalkColumnParsers.fromModelUpdateToDBUpdate({ entryId: undefined }),
    ).toEqual({ entry_id: null });
  });
});
