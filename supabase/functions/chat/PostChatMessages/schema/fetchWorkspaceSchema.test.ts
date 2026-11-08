/**
 * Chat schema fetch must load concept names even when the workspace has no
 * datasets, and must not pull attribute values.
 */
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { describe, expect, it } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

function createFakeClient(rowsByTable: Record<string, unknown[]>): {
  supabaseClient: AvaSupabaseClient;
  queriedTables: string[];
  selectedColumnsByTable: Record<string, string>;
} {
  const queriedTables: string[] = [];
  const selectedColumnsByTable: Record<string, string> = {};
  return {
    queriedTables,
    selectedColumnsByTable,
    supabaseClient: {
      from(table: string) {
        queriedTables.push(table);
        const chain = {
          select: (columns: string) => {
            selectedColumnsByTable[table] = columns;
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

  it("does not query concept attributes or statuses when the workspace has no concepts", async () => {
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
    expect(schema.conceptStatuses).toEqual([]);
    expect(fake.queriedTables).not.toContain("concept_statuses");
  });

  it("returns each case type's status names and positions", async () => {
    const fake = createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
      concept_attributes: [],
      concept_statuses: [
        { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
        { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
      ],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(schema.conceptStatuses).toEqual([
      { concept_id: CONCEPT_ID, name: "Suspected", position: 0 },
      { concept_id: CONCEPT_ID, name: "Confirmed", position: 1 },
    ]);
  });

  it("asks for each field's list flag along with its name", async () => {
    const fake = createFakeClient({
      datasets: [],
      dataset_columns: [],
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
      concept_attributes: [
        { concept_id: CONCEPT_ID, name: "Symptoms", is_array: true },
      ],
      concept_statuses: [],
    });

    const schema = await fetchWorkspaceSchema({
      supabaseClient: fake.supabaseClient,
      workspaceId: WORKSPACE_ID,
    });

    expect(fake.selectedColumnsByTable.concept_attributes).toBe(
      "concept_id, name, is_array",
    );
    expect(schema.conceptAttributes).toEqual([
      { concept_id: CONCEPT_ID, name: "Symptoms", is_array: true },
    ]);
  });
});
