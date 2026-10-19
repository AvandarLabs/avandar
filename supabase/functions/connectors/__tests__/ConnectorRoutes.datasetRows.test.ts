import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { describe, expect, it, vi } from "vitest";
import type {
  Connector,
  ConnectorDatasetRelation,
} from "@sbfn/connectors/Connector.ts";

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  const makeHandler = () => {
    const handler = {
      action: (action: unknown) => {
        return { state: { action } };
      },
      bodySchema: () => {
        return handler;
      },
    };
    return handler;
  };
  return {
    defineRoutes: (functionName: string, routes: Record<string, unknown>) => {
      return { [functionName]: routes };
    },
    GET: makeHandler,
    POST: makeHandler,
  };
});

const { getConnectorMock } = vi.hoisted(() => {
  return { getConnectorMock: vi.fn() };
});

vi.mock("@sbfn/connectors/connectorRegistry.ts", () => {
  return { getConnector: getConnectorMock };
});

const { ConnectorRoutes } = await import("@sbfn/connectors/ConnectorRoutes.ts");

const DATASET_ID = "11111111-1111-4111-8111-111111111111";

const DATASET_RELATION: ConnectorDatasetRelation = {
  workspaceId: "33333333-3333-4333-8333-333333333333",
  connectionId: "44444444-4444-4444-8444-444444444444",
  relationId: "public.customers",
  columnNames: ["id", "name"],
};

type DatasetRowsAction = (options: {
  pathParams: { connectorType: string; datasetId: string };
  supabaseClient: unknown;
  supabaseAdminClient: unknown;
}) => Promise<unknown>;

const _datasetRowsAction = (
  ConnectorRoutes as unknown as Record<
    string,
    Record<string, { GET: { state: { action: DatasetRowsAction } } }>
  >
).connectors!["/:connectorType/datasets/:datasetId/rows"]!.GET.state.action;

/**
 * Calls the dataset rows route for a caller whose access check answers
 * `maySelect`, against a connector backing `relation`.
 */
async function _requestDatasetRows(
  options: Readonly<{
    maySelect: boolean;
    relation: ConnectorDatasetRelation | undefined;
  }>,
): Promise<{
  result: Promise<unknown>;
  connector: Pick<Connector, "getDatasetRelation" | "getRelationRows">;
  supabaseClient: { rpc: ReturnType<typeof vi.fn> };
  supabaseAdminClient: object;
}> {
  const connector = {
    getDatasetRelation: vi.fn(async () => {
      return options.relation;
    }),
    getRelationRows: vi.fn(async () => {
      return new Blob(["id,name\r\n1,Ada"], { type: "text/csv" });
    }),
  };
  getConnectorMock.mockReturnValue(connector);
  const supabaseClient = {
    rpc: vi.fn(async () => {
      return { data: options.maySelect, error: null };
    }),
  };
  const supabaseAdminClient = {};
  const result = _datasetRowsAction({
    pathParams: { connectorType: "postgres", datasetId: DATASET_ID },
    supabaseClient,
    supabaseAdminClient,
  });
  await result.catch(() => {
    // Asserted by the caller.
  });
  return { result, connector, supabaseClient, supabaseAdminClient };
}

describe("ConnectorRoutes - dataset rows", () => {
  it("refuses a caller who may not see the dataset, before reading anything with the service role", async () => {
    const { result, connector, supabaseClient } = await _requestDatasetRows({
      maySelect: false,
      relation: DATASET_RELATION,
    });

    await expect(result).rejects.toBeInstanceOf(AvaHTTPError);
    await expect(result).rejects.toHaveProperty("httpCode", 403);
    expect(supabaseClient.rpc).toHaveBeenCalledWith(
      "util__auth_user_may_select_dataset",
      { p_dataset_id: DATASET_ID },
    );
    expect(connector.getDatasetRelation).not.toHaveBeenCalled();
    expect(connector.getRelationRows).not.toHaveBeenCalled();
  });

  it("reads a dataset the caller may see through the connection it names, in the dataset's own workspace", async () => {
    const { result, connector, supabaseAdminClient } =
      await _requestDatasetRows({
        maySelect: true,
        relation: DATASET_RELATION,
      });

    await expect(result).resolves.toBeInstanceOf(Response);
    expect(connector.getDatasetRelation).toHaveBeenCalledWith(
      supabaseAdminClient,
      DATASET_ID,
    );
    expect(connector.getRelationRows).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: DATASET_RELATION.workspaceId,
        supabaseAdminClient,
      }),
      DATASET_RELATION,
    );
    const response = (await result) as Response;
    expect(response.headers.get("Content-Type")).toBe("text/csv");
  });

  it("refuses a dataset no connector backs the same way as one the caller may not see", async () => {
    const { result } = await _requestDatasetRows({
      maySelect: true,
      relation: undefined,
    });

    await expect(result).rejects.toBeInstanceOf(AvaHTTPError);
    await expect(result).rejects.toHaveProperty("httpCode", 403);
  });
});
