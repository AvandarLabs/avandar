import { describe, expect, it } from "vitest";
import { CrosswalkLayoutParsers } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.ts";

const ROW = {
  column_names: ["CaseNo", "GENDER", "onset_dt"],
  created_at: "2026-11-14T10:00:00+00:00",
  crosswalk_id: "11111111-1111-4111-8111-111111111111",
  id: "22222222-2222-4222-8222-222222222222",
  is_reference: false,
  signature: "l1.0123456789abcdef",
  status: "review" as const,
  updated_at: "2026-11-14T10:00:00+00:00",
  workspace_id: "44444444-4444-4444-8444-444444444444",
};

describe("CrosswalkLayoutParsers", () => {
  it("keeps the column names as the dataset spells them, in order", () => {
    const layout = CrosswalkLayoutParsers.fromDBReadToModelRead(ROW);

    expect(layout.columnNames).toEqual(["CaseNo", "GENDER", "onset_dt"]);
    expect(layout.status).toBe("review");
    expect(layout.crosswalkId).toBe(ROW.crosswalk_id);
  });

  it("refuses a status the schema does not know", () => {
    expect(() => {
      return CrosswalkLayoutParsers.fromDBReadToModelRead({
        ...ROW,
        status: "done" as "review",
      });
    }).toThrow();
  });
});
