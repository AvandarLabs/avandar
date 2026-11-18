import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatasetMutations } from "@/clients/datasets/DatasetClient/createDatasetMutations";
import { DatasetDeleteError } from "@/clients/datasets/DatasetClient/DatasetDeleteError";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetMutationConfig } from "@/clients/datasets/DatasetClient/DatasetClient.types";
import type { ILogger } from "@avandar/logger";

const mocks = vi.hoisted(() => {
  return {
    rpcMock: vi.fn(),
    canAccessResourceMock: vi.fn(),
    deleteParquetMock: vi.fn(),
    deleteOriginalFileMock: vi.fn(),
    getLocalDatasetMock: vi.fn(),
    deleteLocalDatasetMock: vi.fn(),
    dropDuckDbTableMock: vi.fn(),
  };
});
const { rpcMock } = mocks;

vi.mock("$/ServerApiClient", () => {
  return {
    createServerApiClient: () => {
      return { rpc: mocks.rpcMock };
    },
  };
});

vi.mock("@/clients/UserClient", () => {
  return { UserClient: { canAccessResource: mocks.canAccessResourceMock } };
});

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      dropLocalDataset: vi.fn(),
      getById: mocks.getLocalDatasetMock,
      delete: mocks.deleteLocalDatasetMock,
    },
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      dropTable: vi.fn(),
      dropTableViewAndFile: mocks.dropDuckDbTableMock,
    },
  };
});

vi.mock(
  "@/clients/storage/DatasetParquetStorageClient/DatasetParquetStorageClient",
  () => {
    return {
      DatasetParquetStorageClient: { deleteDataset: mocks.deleteParquetMock },
    };
  },
);

vi.mock(
  "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient",
  () => {
    return {
      DatasetOriginalFileStorageClient: {
        deleteOriginalFile: mocks.deleteOriginalFileMock,
      },
    };
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
    error: () => {
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

describe("fullDelete", () => {
  const datasetId = BASE_PARAMS.datasetId;
  const workspaceId = BASE_PARAMS.workspaceId;
  let callOrder: string[];
  let getByIdMock: ReturnType<typeof vi.fn>;
  let deleteRowMock: ReturnType<typeof vi.fn>;

  const _fullDelete = (): Promise<void> => {
    const config = {
      ...CONFIG,
      client: { getById: getByIdMock, delete: deleteRowMock, getAll: vi.fn() },
    } as unknown as DatasetMutationConfig;
    return createDatasetMutations(config).fullDelete({ id: datasetId });
  };

  const _recordCall = (
    name: string,
    mock: ReturnType<typeof vi.fn>,
    result: unknown,
  ): void => {
    mock.mockImplementation(async () => {
      callOrder.push(name);
      return result;
    });
  };

  /** Makes the row readable before the delete and, by default, gone after. */
  const _stubRowReads = (
    options: Readonly<{ sourceType: string; isRowStillThere?: boolean }>,
  ): void => {
    const row = { id: datasetId, workspaceId, sourceType: options.sourceType };
    getByIdMock.mockReset();
    getByIdMock
      .mockImplementationOnce(async () => {
        callOrder.push("readRow");
        return row;
      })
      .mockImplementationOnce(async () => {
        callOrder.push("readRowBack");
        return options.isRowStillThere ? row : undefined;
      });
  };

  beforeEach(() => {
    callOrder = [];
    getByIdMock = vi.fn();
    deleteRowMock = vi.fn();
    Object.values(mocks).forEach((mock) => {
      mock.mockReset();
    });
    _recordCall("canAccess", mocks.canAccessResourceMock, true);
    _recordCall("deleteParquet", mocks.deleteParquetMock, undefined);
    _recordCall("deleteOriginal", mocks.deleteOriginalFileMock, undefined);
    _recordCall("deleteRow", deleteRowMock, undefined);
    _recordCall("deleteLocal", mocks.deleteLocalDatasetMock, undefined);
    _recordCall("dropDuckDb", mocks.dropDuckDbTableMock, undefined);
    mocks.getLocalDatasetMock.mockResolvedValue(undefined);
    _stubRowReads({ sourceType: "csv_file" });
  });

  it("checks admin access before the files, then deletes the row and reads it back", async () => {
    await _fullDelete();

    expect(callOrder).toEqual([
      "readRow",
      "canAccess",
      "deleteParquet",
      "deleteRow",
      "readRowBack",
    ]);
  });

  it("asks for admin access to the dataset through the user client", async () => {
    // `UserClient.canAccessResource` goes through the platform server API,
    // never the webview's Supabase client: on desktop the webview holds no
    // session and only the main process carries the token.
    await _fullDelete();

    expect(mocks.canAccessResourceMock).toHaveBeenCalledWith({
      resourceType: "dataset",
      resourceId: datasetId,
      minRole: "admin",
    });
  });

  it("leaves Storage and the row alone when the user is not a dataset admin", async () => {
    // A pdf dataset, so the retained original is in play and a check moved
    // after its deletion would turn this red.
    _stubRowReads({ sourceType: "pdf_file" });
    _recordCall("canAccess", mocks.canAccessResourceMock, false);

    await expect(_fullDelete()).rejects.toMatchObject({
      name: "DatasetDeleteError",
      reason: "not_allowed",
    });

    expect(callOrder).toEqual(["readRow", "canAccess"]);
  });

  it("leaves Storage and the row alone when the access check itself fails", async () => {
    _stubRowReads({ sourceType: "pdf_file" });
    mocks.canAccessResourceMock.mockImplementation(async () => {
      callOrder.push("canAccess");
      throw new Error("rpc unavailable");
    });

    await expect(_fullDelete()).rejects.toThrow("rpc unavailable");

    expect(callOrder).toEqual(["readRow", "canAccess"]);
  });

  it("does not delete the row when the parquet delete fails", async () => {
    mocks.deleteParquetMock.mockRejectedValue(new Error("storage down"));

    await expect(_fullDelete()).rejects.toThrow("storage down");

    expect(deleteRowMock).not.toHaveBeenCalled();
  });

  it("throws when the row is still there after the delete", async () => {
    // A delete that RLS refuses succeeds with zero rows, so only reading the
    // row back proves it was removed.
    _stubRowReads({ sourceType: "csv_file", isRowStillThere: true });

    const error = await _fullDelete().catch((caught: unknown) => {
      return caught;
    });

    expect(error).toBeInstanceOf(DatasetDeleteError);
    expect(error).toMatchObject({ reason: "still_present", datasetId });
  });

  it("keeps the local copy when the row is still there after the delete", async () => {
    _stubRowReads({ sourceType: "csv_file", isRowStillThere: true });
    mocks.getLocalDatasetMock.mockResolvedValue({ datasetId });

    await _fullDelete().catch(() => {
      return undefined;
    });

    expect(mocks.deleteLocalDatasetMock).not.toHaveBeenCalled();
    expect(mocks.dropDuckDbTableMock).not.toHaveBeenCalled();
  });

  it("removes the local copy after the row is confirmed gone", async () => {
    mocks.getLocalDatasetMock.mockResolvedValue({ datasetId });

    await _fullDelete();

    expect(callOrder.slice(-3)).toEqual([
      "readRowBack",
      "deleteLocal",
      "dropDuckDb",
    ]);
  });

  it("does not remove a retained original for a source that keeps none", async () => {
    await _fullDelete();

    expect(mocks.deleteOriginalFileMock).not.toHaveBeenCalled();
  });

  it("removes the retained original of a pdf dataset", async () => {
    _stubRowReads({ sourceType: "pdf_file" });

    await _fullDelete();

    expect(mocks.deleteOriginalFileMock).toHaveBeenCalledWith({
      workspaceId,
      datasetId,
      fileExtension: "pdf",
    });
  });

  it("removes the retained original after the parquet and before the row", async () => {
    _stubRowReads({ sourceType: "pdf_file" });

    await _fullDelete();

    expect(callOrder).toEqual([
      "readRow",
      "canAccess",
      "deleteParquet",
      "deleteOriginal",
      "deleteRow",
      "readRowBack",
    ]);
  });

  it("still deletes the row when the retained original cannot be removed", async () => {
    _stubRowReads({ sourceType: "pdf_file" });
    mocks.deleteOriginalFileMock.mockRejectedValue(new Error("storage down"));

    await _fullDelete();

    expect(deleteRowMock).toHaveBeenCalledTimes(1);
  });

  it("skips the access check and Storage for a row the user cannot read", async () => {
    getByIdMock.mockReset();
    getByIdMock.mockResolvedValue(undefined);

    await _fullDelete();

    expect(mocks.canAccessResourceMock).not.toHaveBeenCalled();
    expect(mocks.deleteParquetMock).not.toHaveBeenCalled();
    expect(deleteRowMock).toHaveBeenCalledTimes(1);
  });
});
