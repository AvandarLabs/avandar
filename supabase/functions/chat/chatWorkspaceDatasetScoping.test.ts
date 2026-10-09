import { parseOpenRouterResponse } from "@sbfn/chat/PostChatMessages/parsing/parseOpenRouterResponse.ts";
/**
 * The chat turn's dataset context must be scoped to the workspace in the
 * request path, even for a user who can see the same dataset in another
 * workspace.
 *
 * Covers the three steps that turn the database rows into what the model sees
 * and what the browser later runs: `fetchWorkspaceSchema` (the rows),
 * `buildSqlSystemPrompt` (the `tN` alias listing given to the model) and
 * `parseOpenRouterResponse` (the alias-to-table rewrite of the model's SQL).
 *
 * The Supabase client is faked at the PostgREST boundary. The fake holds every
 * row RLS lets this user read: `datasets` SELECT RLS short-circuits on
 * `owner_id = auth.uid()`, so an owner reads their datasets in every workspace
 * they belong to, and the only thing narrowing the result to one workspace is
 * the filter the query applies. The fake applies `.eq` and `.in` filters for
 * real so that filter is what is under test.
 */
import { fetchWorkspaceSchema } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import { describe, expect, it } from "vitest";
import type { AvaSupabaseClient } from "@sbfn/_shared/supabase.ts";

type Row = Record<string, unknown>;
type RowFilter = (row: Row) => boolean;

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ACTIVE_WORKSPACE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_WORKSPACE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// The same file imported into both workspaces: same name, same columns,
// different dataset ids. The other workspace's id sorts first, so if it leaked
// into the alias listing it would take `t0`, the alias a model picks first.
const ACTIVE_DATASET_ID = "d2222222-2222-4222-8222-222222222222";
const OTHER_DATASET_ID = "d1111111-1111-4111-8111-111111111111";
const DATASET_NAME = "Casos de colera";

function _makeDataset(datasetId: string, workspaceId: string): Row {
  return {
    id: datasetId,
    name: DATASET_NAME,
    description: null,
    workspace_id: workspaceId,
    owner_id: USER_ID,
  };
}

function _makeColumns(datasetId: string, workspaceId: string): Row[] {
  return ["region", "casos"].map((columnName) => {
    return {
      id: `${datasetId}-${columnName}`,
      dataset_id: datasetId,
      workspace_id: workspaceId,
      name: columnName,
      data_type: columnName === "casos" ? "number" : "text",
    };
  });
}

/** Every row the user may SELECT under RLS, across both workspaces. */
const RLS_VISIBLE_ROWS: Record<string, Row[]> = {
  datasets: [
    _makeDataset(ACTIVE_DATASET_ID, ACTIVE_WORKSPACE_ID),
    _makeDataset(OTHER_DATASET_ID, OTHER_WORKSPACE_ID),
  ],
  dataset_columns: [
    ..._makeColumns(ACTIVE_DATASET_ID, ACTIVE_WORKSPACE_ID),
    ..._makeColumns(OTHER_DATASET_ID, OTHER_WORKSPACE_ID),
  ],
  concepts: [],
  concept_attributes: [],
};

/**
 * A PostgREST-shaped fake that applies the `.eq` and `.in` filters a query
 * chains, so a query that forgets its workspace filter gets every visible row,
 * exactly as it would against the real database.
 */
function _createRlsScopedClient(rowsByTable: Record<string, Row[]>): {
  supabaseClient: AvaSupabaseClient;
  selectUnfiltered: (table: string) => Row[];
} {
  const supabaseClient = {
    from(table: string) {
      const filters: RowFilter[] = [];
      const chain = {
        select: () => {
          return chain;
        },
        eq: (column: string, value: unknown) => {
          filters.push((row) => {
            return row[column] === value;
          });
          return chain;
        },
        in: (column: string, values: readonly unknown[]) => {
          filters.push((row) => {
            return values.includes(row[column]);
          });
          return chain;
        },
        throwOnError: async () => {
          const rows = (rowsByTable[table] ?? []).filter((row) => {
            return filters.every((filter) => {
              return filter(row);
            });
          });
          return { data: rows };
        },
      };
      return chain;
    },
  } as unknown as AvaSupabaseClient;

  return {
    supabaseClient,
    selectUnfiltered: (table) => {
      return rowsByTable[table] ?? [];
    },
  };
}

async function _buildActiveWorkspaceChatContext(): Promise<{
  schema: Awaited<ReturnType<typeof fetchWorkspaceSchema>>;
  systemPrompt: string;
}> {
  const { supabaseClient } = _createRlsScopedClient(RLS_VISIBLE_ROWS);
  const schema = await fetchWorkspaceSchema({
    supabaseClient,
    workspaceId: ACTIVE_WORKSPACE_ID,
  });
  const systemPrompt = buildSqlSystemPrompt({
    prompt: "cuantos casos hay por region",
    datasets: schema.datasets,
    columns: schema.columns,
    concepts: schema.concepts,
    conceptAttributes: schema.conceptAttributes,
    includeSpatialDocumentation: false,
  });
  return { schema, systemPrompt };
}

describe("chat dataset context for a user in two workspaces", () => {
  it("can see the same dataset in both workspaces when no workspace filter is applied", () => {
    // Positive control for the tests below: the user really can read the
    // other workspace's copy, so excluding it is the query's doing and not an
    // artifact of the fixture.
    const fake = _createRlsScopedClient(RLS_VISIBLE_ROWS);
    expect(
      fake.selectUnfiltered("datasets").map((row) => {
        return row.id;
      }),
    ).toEqual([ACTIVE_DATASET_ID, OTHER_DATASET_ID]);
  });

  it("loads only the active workspace's dataset and columns", async () => {
    const { schema } = await _buildActiveWorkspaceChatContext();

    expect(
      schema.datasets.map((dataset) => {
        return dataset.id;
      }),
    ).toEqual([ACTIVE_DATASET_ID]);
    expect(
      new Set(
        schema.columns.map((column) => {
          return column.dataset_id;
        }),
      ),
    ).toEqual(new Set([ACTIVE_DATASET_ID]));
  });

  it("lists exactly one dataset alias in the system prompt", async () => {
    const { systemPrompt } = await _buildActiveWorkspaceChatContext();

    expect(systemPrompt).toContain(`- t0: ${DATASET_NAME} (region, casos)`);
    expect(systemPrompt).not.toContain("- t1:");
    expect(systemPrompt).not.toContain(OTHER_DATASET_ID);
  });

  it("rewrites the model's t0 to the active workspace's dataset table", async () => {
    const { schema } = await _buildActiveWorkspaceChatContext();

    const parsed = parseOpenRouterResponse({
      message: {
        tool_calls: [
          {
            function: {
              name: "generateSql",
              arguments: JSON.stringify({
                sql: 'SELECT "region", SUM("casos") FROM "t0" GROUP BY "region"',
              }),
            },
          },
        ],
      },
      attemptText: "",
      lastUserPrompt: "cuantos casos hay por region",
      priorClarifications: 0,
      datasets: schema.datasets,
      concepts: schema.concepts,
    });

    expect(parsed.generatedSql?.sql).toContain(`FROM "${ACTIVE_DATASET_ID}"`);
    expect(parsed.generatedSql?.sql).not.toContain(OTHER_DATASET_ID);
  });
});
