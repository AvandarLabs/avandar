import { describe, expect, it } from "vitest";
import { CrosswalkParsers } from "$/models/crosswalks/Crosswalk/Crosswalk.ts";

const ROW = {
  adds_source_column: true,
  codes_output_as: "labels" as const,
  compiled_at: null,
  compiled_code_lists: null,
  created_at: "2026-11-14T10:00:00+00:00",
  description: null,
  id: "11111111-1111-4111-8111-111111111111",
  name: "Measles line lists",
  output_dataset_id: null,
  owner_id: "22222222-2222-4222-8222-222222222222",
  owner_profile_id: "33333333-3333-4333-8333-333333333333",
  updated_at: "2026-11-14T10:00:00+00:00",
  workspace_id: "44444444-4444-4444-8444-444444444444",
};

/** A crosswalk whose combined dataset embedded two code lists. */
const COMPILED_ROW = {
  ...ROW,
  compiled_at: "2026-11-14T11:00:00+00:00",
  compiled_code_lists: [
    {
      code_list_id: "55555555-5555-4555-8555-555555555555",
      fingerprint: "p1.0123456789abcdef",
    },
    {
      code_list_id: "66666666-6666-4666-8666-666666666666",
      fingerprint: "p1.fedcba9876543210",
    },
  ],
  output_dataset_id: "77777777-7777-4777-8777-777777777777",
};

describe("CrosswalkParsers", () => {
  it("reads a crosswalk that has never been combined", () => {
    const crosswalk = CrosswalkParsers.fromDBReadToModelRead(ROW);

    expect(crosswalk.outputDatasetId).toBeUndefined();
    expect(crosswalk.compiledAt).toBeUndefined();
    expect(crosswalk.compiledCodeLists).toBeUndefined();
    expect(crosswalk.codesOutputAs).toBe("labels");
  });

  it("reads compiled code lists with their uuids intact", () => {
    const crosswalk = CrosswalkParsers.fromDBReadToModelRead(COMPILED_ROW);

    expect(crosswalk.compiledCodeLists).toEqual([
      {
        codeListId: "55555555-5555-4555-8555-555555555555",
        fingerprint: "p1.0123456789abcdef",
      },
      {
        codeListId: "66666666-6666-4666-8666-666666666666",
        fingerprint: "p1.fedcba9876543210",
      },
    ]);
    expect(crosswalk.outputDatasetId).toBe(COMPILED_ROW.output_dataset_id);
  });

  it("refuses a compiled code list with no fingerprint", () => {
    expect(() => {
      return CrosswalkParsers.fromDBReadToModelRead({
        ...COMPILED_ROW,
        compiled_code_lists: [
          { code_list_id: "55555555-5555-4555-8555-555555555555" },
        ],
      });
    }).toThrow();
  });

  it("writes a cleared description as null and leaves out unset columns", () => {
    const dbRow = CrosswalkParsers.fromModelUpdateToDBUpdate({
      name: "Renamed",
      description: undefined,
    });

    expect(dbRow).toEqual({ name: "Renamed", description: null });
  });
});
