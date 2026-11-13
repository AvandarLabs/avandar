import { loadColumnCodes } from "@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts";
import { describe, expect, it } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/** Each `from` table and `select` string the fake client was asked for. */
const queries: Array<{ table: string; select: string }> = [];

/** A client whose bindings query answers `rows`, or fails. */
function _createClient(
  answer: { rows: unknown[] } | { error: Error },
): AvaSupabaseClient {
  let table = "";
  const chain = {
    select: (columns: string) => {
      queries.push({ table, select: columns });
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
  // Fakes only the query chain, too unlike the client for a single `as`.
  return {
    from: (name: string) => {
      table = name;
      return chain;
    },
  } as unknown as AvaSupabaseClient;
}

const BOUND_ROW = {
  id: "binding-gender",
  dataset_column_id: "col-gender",
  mode: "reference",
  direction: "decode",
  keeps_original: false,
  pinned_pairs: null,
  pinned_is_ordered: null,
  applied_dictionary_version: 2,
  dictionary: { id: "dict-1", name: "NYS codes", version: 3 },
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
  it("embeds the dictionary, entry, and code list through the binding's foreign keys", async () => {
    queries.length = 0;

    await loadColumnCodes({
      supabaseClient: _createClient({ rows: [] }),
      workspaceId: "workspace-1",
    });

    expect(queries).toEqual([
      {
        table: "dataset_columns__dictionary_bindings",
        select:
          "id, dataset_column_id, mode, direction, keeps_original, pinned_pairs, pinned_is_ordered, applied_dictionary_version, dictionary:data_dictionaries(id, name, version), entry:data_dictionaries__entries(id, name, description), code_list:data_dictionaries__code_lists(id, name, is_ordered, pairs)",
      },
    ]);
  });

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

  it("describes a converted column by the labels it holds, with its versions", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({
        rows: [{ ...BOUND_ROW, mode: "convert" }],
      }),
      workspaceId: "workspace-1",
    });

    expect(codes.get("col-gender")).toMatchObject({
      direction: "encode",
      appliedDictionaryVersion: 2,
      currentDictionaryVersion: 3,
    });
  });

  it("keeps a pinned binding whose dictionary the reader cannot see, with its pinned pairs", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({
        rows: [
          {
            ...BOUND_ROW,
            mode: "convert",
            pinned_pairs: [
              {
                code: "1",
                label: "Male",
                accepted_spellings: [],
                is_missing: false,
              },
            ],
            pinned_is_ordered: false,
            dictionary: null,
            entry: null,
            code_list: null,
          },
        ],
      }),
      workspaceId: "workspace-1",
    });

    expect(codes.get("col-gender")).toMatchObject({
      isSourceDeleted: true,
      pairs: [
        { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      ],
    });
  });

  it("gives no codes when the bindings cannot be read", async () => {
    const codes = await loadColumnCodes({
      supabaseClient: _createClient({ error: new Error("relation missing") }),
      workspaceId: "workspace-1",
    });

    expect(codes.size).toBe(0);
  });
});
