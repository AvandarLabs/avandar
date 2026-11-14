import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { useSaveCombinedDataset } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useSaveCombinedDataset/useSaveCombinedDataset";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CompileCrosswalkResult } from "@/lib/crosswalks/compileCrosswalk/compileCrosswalk";

type MutationOptions = { onError: (error: unknown) => void };

const mocks = vi.hoisted(() => {
  return {
    mutateAsyncMock: vi.fn(),
    clearCachesMock: vi.fn(() => {
      return Promise.resolve();
    }),
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    notifySuccessMock: vi.fn(),
    isOnline: true,
    user: { id: "user-1", email: "pablo@avandarlabs.com" } as
      | { id: string; email: string }
      | undefined,
    mutationOptions: undefined as MutationOptions | undefined,
  };
});

vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      useSaveCombinedDataset: (options: MutationOptions) => {
        mocks.mutationOptions = options;
        return [vi.fn(), false, { mutateAsync: mocks.mutateAsyncMock }];
      },
    },
  };
});
vi.mock(
  "@/lib/crosswalks/clearCombinedDatasetCaches/clearCombinedDatasetCaches",
  () => {
    return { clearCombinedDatasetCaches: mocks.clearCachesMock };
  },
);
vi.mock(
  "@/views/DataManagerApp/CrosswalkView/useCrosswalkErrorMessage/useCrosswalkErrorMessage",
  () => {
    return {
      useCrosswalkErrorMessage: () => {
        return () => {
          return "Only workspace admins can add datasets.";
        };
      },
    };
  },
);
vi.mock("$/lib/uuid", () => {
  return {
    uuid: () => {
      return "66666666-6666-4666-8666-666666666666";
    },
  };
});
vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    getIsOnline: () => {
      return mocks.isOnline;
    },
  };
});
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useQueryClient: () => {
      return {};
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return mocks.navigateMock;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return mocks.user;
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifyError: mocks.notifyErrorMock,
    notifySuccess: mocks.notifySuccessMock,
  };
});

const CROSSWALK_ID = "12121212-1212-4121-8121-121212121212" as Crosswalk.Id;
const COMBINED_ID = "55555555-5555-4555-8555-555555555555" as Dataset.Id;
const NEW_ID = "66666666-6666-4666-8666-666666666666";
const RESULT: Extract<CompileCrosswalkResult, { status: "ready" }> = {
  status: "ready",
  sql: "SELECT 1",
  columns: [{ name: "case_id", dataType: "varchar" }],
  bindings: [],
  compiledCodeLists: [],
  includedDatasetIds: [],
  problems: [],
};

const OPTIONS = {
  crosswalkId: CROSSWALK_ID,
  outputDatasetId: undefined,
  result: RESULT,
  datasetName: "A",
};

function _renderSave() {
  return renderHook(
    () => {
      return useSaveCombinedDataset();
    },
    { wrapper: TestProviders },
  );
}

describe("useSaveCombinedDataset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isOnline = true;
    mocks.user = { id: "user-1", email: "pablo@avandarlabs.com" };
    mocks.clearCachesMock.mockImplementation(() => {
      return Promise.resolve();
    });
    mocks.navigateMock.mockImplementation(() => {
      return Promise.resolve();
    });
    mocks.mutateAsyncMock.mockImplementation(
      (payload: { datasetId: string }) => {
        return Promise.resolve(payload.datasetId);
      },
    );
  });

  it("creates the combined dataset with a new id, clears its caches, says so, and opens it", async () => {
    const { result } = _renderSave();

    let savedId: string | undefined;
    await act(async () => {
      savedId = await result.current[0]({
        crosswalkId: CROSSWALK_ID,
        outputDatasetId: undefined,
        result: RESULT,
        datasetName: "  Measles line lists ",
      });
    });

    expect(mocks.mutateAsyncMock).toHaveBeenCalledWith({
      crosswalkId: CROSSWALK_ID,
      datasetId: NEW_ID,
      datasetName: "Measles line lists",
      rawSql: "SELECT 1",
      columns: RESULT.columns,
      bindings: [],
      compiledCodeLists: [],
    });
    expect(savedId).toBe(NEW_ID);
    expect(mocks.clearCachesMock).toHaveBeenCalledWith({
      queryClient: {},
      datasetId: NEW_ID,
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
      "Created Measles line lists.",
    );
    expect(mocks.navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ datasetId: NEW_ID }),
      }),
    );
  });

  it("updates the existing combined dataset under its own id", async () => {
    const { result } = _renderSave();

    await act(async () => {
      await result.current[0]({
        crosswalkId: CROSSWALK_ID,
        outputDatasetId: COMBINED_ID,
        result: RESULT,
        datasetName: "Measles combined",
      });
    });

    expect(mocks.mutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ datasetId: COMBINED_ID }),
    );
    expect(mocks.notifySuccessMock).toHaveBeenCalledWith(
      "Updated Measles combined.",
    );
  });

  it("ignores a second press while one is saving", async () => {
    mocks.mutateAsyncMock.mockReturnValue(new Promise(() => {}));
    const { result } = _renderSave();
    const options = {
      crosswalkId: CROSSWALK_ID,
      outputDatasetId: undefined,
      result: RESULT,
      datasetName: "A",
    };

    act(() => {
      void result.current[0](options);
      void result.current[0](options);
    });

    expect(mocks.mutateAsyncMock).toHaveBeenCalledTimes(1);
  });

  it("says when it is offline and sends nothing", async () => {
    mocks.isOnline = false;
    const { result } = _renderSave();

    await act(async () => {
      await result.current[0]({
        crosswalkId: CROSSWALK_ID,
        outputDatasetId: undefined,
        result: RESULT,
        datasetName: "A",
      });
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "You're offline. Reconnect to save this.",
    );
    expect(mocks.mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("explains a refusal, and neither clears nor navigates", async () => {
    const refusal = new Error("refused");
    mocks.mutateAsyncMock.mockImplementation(() => {
      mocks.mutationOptions?.onError(refusal);
      return Promise.reject(refusal);
    });
    const { result } = _renderSave();

    let savedId: string | undefined = "not set";
    await act(async () => {
      savedId = await result.current[0]({
        crosswalkId: CROSSWALK_ID,
        outputDatasetId: undefined,
        result: RESULT,
        datasetName: "A",
      });
    });

    expect(savedId).toBeUndefined();
    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "Only workspace admins can add datasets.",
    );
    expect(mocks.clearCachesMock).not.toHaveBeenCalled();
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });
  it("stays saving until the caches are cleared and the dataset is open", async () => {
    let finishClearing: () => void = () => {};
    let finishOpening: () => void = () => {};
    mocks.clearCachesMock.mockImplementation(() => {
      return new Promise<void>((resolve) => {
        finishClearing = resolve;
      });
    });
    mocks.navigateMock.mockImplementation(() => {
      return new Promise<void>((resolve) => {
        finishOpening = resolve;
      });
    });
    const { result } = _renderSave();

    let saving: Promise<unknown> = Promise.resolve();
    act(() => {
      saving = result.current[0](OPTIONS);
    });
    await waitFor(() => {
      expect(mocks.clearCachesMock).toHaveBeenCalled();
    });
    expect(result.current[1]).toBe(true);

    await act(async () => {
      finishClearing();
    });
    await waitFor(() => {
      expect(mocks.navigateMock).toHaveBeenCalled();
    });
    expect(result.current[1]).toBe(true);

    await act(async () => {
      finishOpening();
      await saving;
    });
    expect(result.current[1]).toBe(false);
  });

  it("says so when there is no signed-in user to clear caches for, and still opens the dataset", async () => {
    mocks.user = undefined;
    const { result } = _renderSave();

    await act(async () => {
      await result.current[0](OPTIONS);
    });

    expect(mocks.clearCachesMock).not.toHaveBeenCalled();
    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "A was saved, but this device may still show its old rows. Reload the page to refresh them.",
    );
    expect(mocks.navigateMock).toHaveBeenCalled();
  });

  it("says so when the caches could not be cleared, and still opens the dataset", async () => {
    mocks.clearCachesMock.mockRejectedValue(new Error("cache"));
    const { result } = _renderSave();

    await act(async () => {
      await result.current[0](OPTIONS);
    });

    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "A was saved, but this device may still show its old rows. Reload the page to refresh them.",
    );
    expect(mocks.notifySuccessMock).toHaveBeenCalledWith("Created A.");
    expect(mocks.navigateMock).toHaveBeenCalled();
  });

  it("reports a failure to open the saved dataset, and still resolves its id", async () => {
    mocks.navigateMock.mockRejectedValue(new Error("navigation"));
    const { result } = _renderSave();

    let savedId: string | undefined;
    await act(async () => {
      savedId = await result.current[0](OPTIONS);
    });

    expect(savedId).toBe(NEW_ID);
    expect(mocks.notifyErrorMock).toHaveBeenCalledWith(
      "A was saved, but it could not be opened. Open it from the dataset list.",
    );
    expect(result.current[1]).toBe(false);
  });
});
