import { describe, expect, it } from "vitest";
import { CrosswalkMappingParsers } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.ts";

const ROW = {
  column_id: "11111111-1111-4111-8111-111111111111",
  confidence: 0.94,
  created_at: "2026-11-14T10:00:00+00:00",
  crosswalk_id: "22222222-2222-4222-8222-222222222222",
  fill: {
    version: 1,
    kind: "column",
    source_column: "onset_dt",
    convert: { kind: "parse_date", format: "%m/%d/%Y" },
    code_list_id: null,
    holds_labels: false,
  },
  id: "33333333-3333-4333-8333-333333333333",
  layout_id: "44444444-4444-4444-8444-444444444444",
  reason: "name_and_type" as const,
  status: "suggested" as const,
  updated_at: "2026-11-14T10:00:00+00:00",
  workspace_id: "66666666-6666-4666-8666-666666666666",
};

describe("CrosswalkMappingParsers", () => {
  it("reads the stored fill into its model shape", () => {
    const mapping = CrosswalkMappingParsers.fromDBReadToModelRead(ROW);

    expect(mapping.fill).toEqual({
      kind: "column",
      sourceColumn: "onset_dt",
      convert: { kind: "parse_date", format: "%m/%d/%Y" },
      codeListId: undefined,
      holdsLabels: false,
    });
    expect(mapping.confidence).toBe(0.94);
    expect(mapping.reason).toBe("name_and_type");
  });

  it("reads a fill set by hand with no confidence or reason", () => {
    const mapping = CrosswalkMappingParsers.fromDBReadToModelRead({
      ...ROW,
      confidence: null,
      reason: null,
      status: "confirmed",
      fill: { version: 1, kind: "constant", value: "Bronx" },
    });

    expect(mapping.confidence).toBeUndefined();
    expect(mapping.reason).toBeUndefined();
    expect(mapping.fill).toEqual({ kind: "constant", value: "Bronx" });
  });

  it("writes the fill back in the stored shape", () => {
    const mapping = CrosswalkMappingParsers.fromDBReadToModelRead(ROW);

    expect(
      CrosswalkMappingParsers.fromModelUpdateToDBUpdate({ fill: mapping.fill })
        .fill,
    ).toEqual(ROW.fill);
  });
});
