import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetMutationConfig } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { ILogger } from "@avandar/logger";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => {
  return { rpcMock: vi.fn() };
});

vi.mock("$/ServerApiClient", () => {
  return {
    createServerApiClient: () => {
      return { rpc: rpcMock };
    },
  };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return { LocalDatasetClient: { dropLocalDataset: vi.fn() } };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { dropTable: vi.fn() } };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return { DatasetParquetStorageClient: { deleteDataset: vi.fn() } };
  },
);

function _makeLogger(): ILogger {
  const logger = {
    appendName: () => {
      return logger;
    },
    log: () => {
      return undefined;
    },
  };
  return logger as unknown as ILogger;
}

const CONFIG = {
  logger: _makeLogger(),
  parsers: {
    fromDBReadToModelRead: (row: unknown) => {
      return row;
    },
  },
} as unknown as DatasetMutationConfig;

const BASE_PARAMS = {
  datasetId: "11111111-1111-4111-8111-111111111111" as Dataset.Id,
  workspaceId: "33333333-3333-4333-8333-333333333333",
  datasetName: "Quarterly numbers",
  datasetDescription: "",
  columns: [],
  rowsToSkip: 0,
  // A Google `sub`, which is what `tokens__google.google_account_id` stores.
  googleAccountId: "108374652910384756291",
  googleDocumentId: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
} as unknown as Parameters<
  ReturnType<
    typeof import("@/clients/datasets/DatasetClient/createDatasetMutations").createDatasetMutations
  >["insertGoogleSheetsDataset"]
>[0];

async function _insert(
  overrides: Readonly<{ sheetName?: string }> = {},
): Promise<Record<string, unknown>> {
  const { createDatasetMutations } =
    await import("@/clients/datasets/DatasetClient/createDatasetMutations");
  await createDatasetMutations(CONFIG).insertGoogleSheetsDataset({
    ...BASE_PARAMS,
    ...overrides,
  });
  return rpcMock.mock.calls[0]![1] as Record<string, unknown>;
}

describe("insertGoogleSheetsDataset", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ id: BASE_PARAMS.datasetId });
  });

  it("sends the chosen tab wrapped in the nullable-text composite", async () => {
    // `util__nullable_text` exists because Supabase will not generate a
    // nullable scalar parameter, so the RPC takes `{ value }` and not a bare
    // string. Sending the bare string would be a Postgres type error at call
    // time.
    const args = await _insert({ sheetName: "Q3 data" });

    expect(args.p_sheet_name).toEqual({ value: "Q3 data" });
  });

  it("sends an explicit null wrapper when no tab is given", async () => {
    const args = await _insert();

    expect(args.p_sheet_name).toEqual({ value: null });
  });

  it("still sends the document and account ids", async () => {
    // Positive control: without it, a mutation that dropped every argument but
    // `p_sheet_name` would satisfy both tests above.
    const args = await _insert({ sheetName: "Q3 data" });

    expect(args.p_google_document_id).toBe(BASE_PARAMS.googleDocumentId);
    expect(args.p_google_account_id).toBe(BASE_PARAMS.googleAccountId);
  });
});
