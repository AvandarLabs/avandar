import { prop, sortObjList } from "@avandar/utils";
import { createPostgresConnector } from "@sbfn/connectors/postgres/createPostgresConnector/createPostgresConnector.ts";
import { PostgresCatalog } from "@sbfn/connectors/postgres/createPostgresConnector/PostgresCatalog.ts";
import { describe, expect, it, vi } from "vitest";
import type { ConnectorContext } from "@sbfn/connectors/Connector.ts";

const DATASET_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";

type QueryLog = Array<{ table: string; filters: Record<string, unknown> }>;

/** A `dataset_columns` row, as much of it as this lookup reads or sorts. */
type StoredColumnRow = { original_name: string; column_idx: number };

/**
 * The stored columns' names as the database would return them, ordered by
 * `column` in the direction asked for.
 */
function _orderStoredColumns(
  options: Readonly<{
    storedColumns: readonly StoredColumnRow[];
    column: keyof StoredColumnRow;
    ascending: boolean;
  }>,
): Array<{ original_name: string }> {
  const sortedColumns = sortObjList(options.storedColumns, {
    sortBy: prop(options.column),
  });
  const orderedColumns = options.ascending
    ? sortedColumns
    : sortedColumns.reverse();
  return orderedColumns.map((storedColumn) => {
    return { original_name: storedColumn.original_name };
  });
}

/**
 * A service-role client holding one dataset's Postgres source row (or none)
 * and its stored columns, logging each table it is asked for and the
 * filters applied. Its `order` really sorts by the column and direction it
 * is given, so a lookup that asked for the wrong order would get it.
 */
function _makeAdminClient(
  options: Readonly<{
    sourceRow: Record<string, unknown> | null;
    storedColumns: readonly StoredColumnRow[];
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
      order: vi.fn(
        async (
          column: keyof StoredColumnRow,
          { ascending = true }: { ascending?: boolean } = {},
        ) => {
          return {
            data: _orderStoredColumns({
              storedColumns: options.storedColumns,
              column,
              ascending,
            }),
            error: null,
          };
        },
      ),
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

    const relation = await connector.getDatasetRelation({
      supabaseAdminClient: _makeAdminClient({
        sourceRow: {
          workspace_id: WORKSPACE_ID,
          connection_id: "44444444-4444-4444-8444-444444444444",
          schema_name: "sales",
          table_name: "orders.2024",
        },
        // Neither alphabetical nor reversed order matches the stored one.
        storedColumns: [
          { original_name: "placed_at", column_idx: 1 },
          { original_name: "order_id", column_idx: 0 },
          { original_name: "amount", column_idx: 2 },
        ],
        queryLog,
      }),
      datasetId: DATASET_ID,
    });

    expect(relation).toMatchObject({
      workspaceId: WORKSPACE_ID,
      connectionId: "44444444-4444-4444-8444-444444444444",
      columnNames: ["order_id", "placed_at", "amount"],
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

    await connector.getDatasetRelation({
      supabaseAdminClient: _makeAdminClient({
        sourceRow: {
          workspace_id: WORKSPACE_ID,
          connection_id: "44444444-4444-4444-8444-444444444444",
          schema_name: "public",
          table_name: "customers",
        },
        storedColumns: [{ original_name: "id", column_idx: 0 }],
        queryLog,
      }),
      datasetId: DATASET_ID,
    });

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

    const relation = await connector.getDatasetRelation({
      supabaseAdminClient: _makeAdminClient({
        sourceRow: null,
        storedColumns: [],
        queryLog: [],
      }),
      datasetId: DATASET_ID,
    });

    expect(relation).toBeUndefined();
  });
});
