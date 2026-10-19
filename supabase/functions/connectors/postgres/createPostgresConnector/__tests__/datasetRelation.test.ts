import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { PostgresCatalog } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCatalog.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";

const DATASET_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";

type QueryLog = Array<{ table: string; filters: Record<string, unknown> }>;

/**
 * A service-role client holding one dataset's Postgres source row (or none)
 * and its stored columns, logging each table it is asked for and the
 * filters applied.
 */
function _makeAdminClient(
  options: Readonly<{
    sourceRow: Record<string, unknown> | null;
    storedColumnNames: readonly string[];
    queryLog: QueryLog;
  }>,
): ConnectorContext["supabaseAdminClient"] {
  const from = vi.fn((table: string) => {
    const filters: Record<string, unknown> = {};
    options.queryLog.push({ table, filters });
    const builder = {
      select: vi.fn(() => {
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      }),
      maybeSingle: vi.fn(async () => {
        return { data: options.sourceRow, error: null };
      }),
      order: vi.fn(async () => {
        return {
          data: options.storedColumnNames.map((originalName) => {
            return { original_name: originalName };
          }),
          error: null,
        };
      }),
    };
    return builder;
  });
  // A partial fake: only the query builder calls this lookup makes.
  return { from } as unknown as ConnectorContext["supabaseAdminClient"];
}

describe("createPostgresConnector - what a dataset reads", () => {
  it("reads a dataset's connection, relation and stored columns in their stored order", async () => {
    const queryLog: QueryLog = [];
    const connector = createPostgresConnector();

    const relation = await connector.getDatasetRelation(
      _makeAdminClient({
        sourceRow: {
          workspace_id: WORKSPACE_ID,
          connection_id: "44444444-4444-4444-8444-444444444444",
          schema_name: "sales",
          table_name: "orders.2024",
        },
        storedColumnNames: ["order_id", "placed_at"],
        queryLog,
      }),
      DATASET_ID,
    );

    expect(relation).toMatchObject({
      workspaceId: WORKSPACE_ID,
      connectionId: "44444444-4444-4444-8444-444444444444",
      columnNames: ["order_id", "placed_at"],
    });
    // The table name's own dot survives the round trip through the id.
    expect(PostgresCatalog.parseRelationId(relation!.relationId)).toEqual({
      schemaName: "sales",
      tableName: "orders.2024",
    });
  });

  it("reads the stored columns only from the dataset's own workspace", async () => {
    const queryLog: QueryLog = [];
    const connector = createPostgresConnector();

    await connector.getDatasetRelation(
      _makeAdminClient({
        sourceRow: {
          workspace_id: WORKSPACE_ID,
          connection_id: "44444444-4444-4444-8444-444444444444",
          schema_name: "public",
          table_name: "customers",
        },
        storedColumnNames: ["id"],
        queryLog,
      }),
      DATASET_ID,
    );

    expect(queryLog).toEqual([
      {
        table: "datasets__postgres_table",
        filters: { dataset_id: DATASET_ID },
      },
      {
        table: "dataset_columns",
        filters: { dataset_id: DATASET_ID, workspace_id: WORKSPACE_ID },
      },
    ]);
  });

  it("finds nothing for a dataset no Postgres table backs", async () => {
    const connector = createPostgresConnector();

    const relation = await connector.getDatasetRelation(
      _makeAdminClient({
        sourceRow: null,
        storedColumnNames: [],
        queryLog: [],
      }),
      DATASET_ID,
    );

    expect(relation).toBeUndefined();
  });
});
