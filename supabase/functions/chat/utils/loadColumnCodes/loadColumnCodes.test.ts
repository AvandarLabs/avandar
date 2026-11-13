import { loadColumnCodes } from "@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts";
import { describe, expect, it } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** A client whose bindings query answers `rows`, or fails. */
function _createClient(
  answer: { rows: unknown[] } | { error: Error },
): AvaSupabaseClient {
  const chain = {
    select: () => {
      return chain;
    },
    eq: () => {
      return chain;
    },
    throwOnError: async () => {
      if ("error" in answer) {
        throw answer.error;
      }
      return { data: answer.rows };
    },
  };
  return {
    from: () => {
      return chain;
    },
  } as unknown as AvaSupabaseClient;
}

const BOUND_ROW = {
  dataset_column_id: "col-gender",
  mode: "reference",
  direction: "decode",
  dictionary: { id: "dict-1", name: "NYS codes" },
  entry: { id: "entry-sex", name: "sex", description: null },
  code_list: {
    id: "list-sex",
    name: "Sex (1/2/9)",
    is_ordered: false,
    pairs: [
      { code: "2", label: "Female", accepted_spellings: [], is_missing: false },
    ],
  },
};

describe("loadColumnCodes", () => {
  it("reads each bound column's stored pairs", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({ rows: [BOUND_ROW] }),
      workspaceId: "workspace-1",
    });

    expect(codes.get("col-gender")?.pairs).toEqual([
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
    ]);
  });

  it("leaves out a column whose dictionary the reader cannot see", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({
        rows: [
          { ...BOUND_ROW, dictionary: null, entry: null, code_list: null },
        ],
      }),
      workspaceId: "workspace-1",
    });

    expect(codes.size).toBe(0);
  });

  it("gives no codes when the bindings cannot be read", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({ error: new Error("relation missing") }),
      workspaceId: "workspace-1",
    });

    expect(codes.size).toBe(0);
  });
});
