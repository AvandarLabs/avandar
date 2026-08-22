import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

/**
 * Chat schema fetch must load concept names even when the workspace has no
 * datasets, and must not pull attribute values.
 */
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { describe, expect, it } from "vitest";

function createFakeClient(rowsByTable: Record<string, unknown[]>): {
  supabaseClient: AvaSupabaseClient;
  queriedTables: string[];
} {
  const queriedTables: string[] = [];
  return {
    queriedTables,
    supabaseClient: {
      from(table: string) {
        queriedTables.push(table);
        const chain = {
          select: () => {
            return chain;
          },
          eq: () => {
            return chain;
          },
          in: () => {
            return chain;
          },
          throwOnError: async () => {
            return { data: rowsByTable[table] ?? [] };
          },
        };
        return chain;
      },
    } as unknown as AvaSupabaseClient,
  };
}

const WORKSPACE_ID = "wwwwwwww-wwww-4www-8www-wwwwwwwwwwww";
const CONCEPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("fetchWorkspaceSchema", () => {
  it("returns concepts when the workspace has no datasets", async () => {
    const fake = createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
      concept_attributes: [{ concept_id: CONCEPT_ID, name: "status" }],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(schema.datasets).toEqual([]);
    expect(schema.columns).toEqual([]);
    expect(schema.concepts).toEqual([{ id: CONCEPT_ID, name: "Case" }]);
    expect(schema.conceptAttributes).toEqual([
      { concept_id: CONCEPT_ID, name: "status" },
    ]);
  });

  it("does not query concept attributes when the workspace has no concepts", async () => {
    const fake = createFakeClient({
      datasets: [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Cholera" },
      ],
      dataset_columns: [],
      concepts: [],
      concept_attributes: [{ concept_id: CONCEPT_ID, name: "status" }],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(schema.concepts).toEqual([]);
    expect(schema.conceptAttributes).toEqual([]);
    expect(fake.queriedTables).not.toContain("concept_attributes");
  });
});
