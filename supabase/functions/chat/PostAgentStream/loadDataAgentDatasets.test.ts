import { loadDataAgentDatasets } from "@sbfn/chat/PostAgentStream/loadDataAgentDatasets.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

const { loadColumnCodesMock } = vi.hoisted(() => {
  return { loadColumnCodesMock: vi.fn() };
});

vi.mock("@sbfn/chat/utils/loadColumnCodes/loadColumnCodes.ts", () => {
  return { loadColumnCodes: loadColumnCodesMock };
});

/** A client that answers each table's query with its rows. */
function _createClient(
  rowsByTable: Record<string, unknown[]>,
): AvaSupabaseClient {
  return {
    from: (table: string) => {
      const chain = {
        select: () => {
          return chain;
        },
        eq: () => {
          return chain;
        },
        order: () => {
          return chain;
        },
        throwOnError: async () => {
          return { data: rowsByTable[table] ?? [] };
        },
      };
      return chain;
    },
  } as unknown as AvaSupabaseClient;
}

const DATASET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  loadColumnCodesMock.mockResolvedValue(new Map());
});

describe("loadDataAgentDatasets", () => {
  it("gives a bound column its code list and description", async () => {
    loadColumnCodesMock.mockResolvedValue(
      new Map([
        [
          "col-gender",
          {
            direction: "decode",
            pairs: [
              {
                code: "2",
                label: "Female",
                acceptedSpellings: [],
                isMissing: false,
              },
            ],
            description: "Sex on the report.",
          },
        ],
      ]),
    );

    const datasets = await loadDataAgentDatasets({
      supabaseClient: _createClient({
        datasets: [{ id: DATASET_ID, name: "Line list" }],
        dataset_columns: [
          {
            id: "col-gender",
            dataset_id: DATASET_ID,
            name: "GENDER",
            data_type: "bigint",
          },
          {
            id: "col-county",
            dataset_id: DATASET_ID,
            name: "county",
            data_type: "varchar",
          },
        ],
      }),
      workspaceId: "workspace-1",
    });

    expect(datasets[0]?.columns).toEqual([
      {
        name: "GENDER",
        dataType: "bigint",
        codes: {
          direction: "decode",
          pairs: [
            {
              code: "2",
              label: "Female",
              acceptedSpellings: [],
              isMissing: false,
            },
          ],
          description: "Sex on the report.",
        },
      },
      { name: "county", dataType: "varchar" },
    ]);
  });
});
