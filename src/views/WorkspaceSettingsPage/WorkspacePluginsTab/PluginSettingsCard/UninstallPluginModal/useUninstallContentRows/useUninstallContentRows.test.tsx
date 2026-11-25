import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { useUninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    importsByContentId: {} as Record<string, { datasetId: string }>,
    datasets: [] as Array<{ id: string; name: string }>,
    isFetchingDatasets: false,
    isErrorDatasets: false,
    isFetchingImports: false,
    isErrorImports: false,
    refetchImports: vi.fn(),
    refetchDatasets: vi.fn(),
    datasetsArgs: undefined as unknown,
    canAccessResource: vi.fn(),
  };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent",
  () => {
    return {
      useImportedPluginContent: () => {
        return {
          importsByContentId: mocks.importsByContentId,
          isLoading: false,
          isFetching: mocks.isFetchingImports,
          isError: mocks.isErrorImports,
          hasFailed: mocks.isErrorImports && !mocks.isFetchingImports,
          refetch: mocks.refetchImports,
        };
      },
    };
  },
);
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: (args: unknown) => {
        mocks.datasetsArgs = args;
        return [
          mocks.datasets,
          false,
          {
            isFetching: mocks.isFetchingDatasets,
            isError: mocks.isErrorDatasets,
            refetch: mocks.refetchDatasets,
          },
        ];
      },
    },
  };
});
vi.mock("@/clients/UserClient", () => {
  return { UserClient: { canAccessResource: mocks.canAccessResource } };
});

let queryClient: QueryClient;

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <TestProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestProviders>
  );
}

/** Lets a late access check fire so an assertion that none did can fail. */
async function _flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });
}

function _renderRows() {
  return renderHook(
    () => {
      return useUninstallContentRows("avandar.mozambique");
    },
    { wrapper: Wrapper },
  );
}

describe("useUninstallContentRows", () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.importsByContentId = {
      provinces: { datasetId: "dataset-provinces" },
      districts: { datasetId: "dataset-districts" },
    };
    mocks.datasets = [
      { id: "dataset-provinces", name: "Provinces (renamed)" },
      { id: "dataset-districts", name: "Districts" },
    ];
    mocks.isFetchingDatasets = false;
    mocks.isErrorDatasets = false;
    mocks.isFetchingImports = false;
    mocks.isErrorImports = false;
    mocks.refetchImports.mockReset();
    mocks.refetchDatasets.mockReset();
    mocks.datasetsArgs = undefined;
    mocks.canAccessResource.mockReset();
    mocks.canAccessResource.mockResolvedValue(true);
  });

  it("names each row after the dataset's current name", async () => {
    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const names = result.current.rows.map((row) => {
      return row.name;
    });
    expect(names).toHaveLength(2);
    expect(names).toContain("Provinces (renamed)");
  });

  it("sorts the rows by name", async () => {
    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(
      result.current.rows.map((row) => {
        return row.name;
      }),
    ).toEqual(["Districts", "Provinces (renamed)"]);
  });

  it("marks a dataset the user may not delete", async () => {
    mocks.canAccessResource.mockImplementation(
      async ({ resourceId }: { resourceId: string }) => {
        return resourceId === "dataset-districts";
      },
    );

    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.rows).toEqual([
      { datasetId: "dataset-districts", name: "Districts", canDelete: true },
      {
        datasetId: "dataset-provinces",
        name: "Provinces (renamed)",
        canDelete: false,
      },
    ]);
  });

  it("counts imports whose dataset the user cannot read instead of naming them", async () => {
    mocks.datasets = [{ id: "dataset-districts", name: "Districts" }];

    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.hiddenCount).toBe(1);
  });

  it("is not failed when every lookup succeeded", async () => {
    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasFailed).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it("has failed when an access check fails, listing no row from the other answers", async () => {
    mocks.canAccessResource.mockImplementation(
      async ({ resourceId }: { resourceId: string }) => {
        if (resourceId === "dataset-provinces") {
          throw new Error("rpc failed");
        }
        return true;
      },
    );

    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.hasFailed).toBe(true);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
  });

  it("stays loading until every access check has answered", () => {
    mocks.canAccessResource.mockImplementation(() => {
      return new Promise(() => {});
    });

    const { result } = _renderRows();

    expect(result.current.isLoading).toBe(true);
  });

  it("stays loading and checks no access while the dataset refetch is in flight", async () => {
    mocks.isFetchingDatasets = true;

    const { result } = _renderRows();
    await _flush();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
  });

  it("lists rows and starts the access checks once the refetch settles", async () => {
    mocks.isFetchingDatasets = true;
    const { result, rerender } = _renderRows();
    await _flush();
    expect(mocks.canAccessResource).not.toHaveBeenCalled();

    mocks.isFetchingDatasets = false;
    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.rows).toHaveLength(2);
    expect(mocks.canAccessResource).toHaveBeenCalledTimes(2);
  });

  it("has failed, listing nothing and counting nothing as unseen, when the dataset lookup fails", async () => {
    mocks.isErrorDatasets = true;

    const { result } = _renderRows();
    await _flush();

    expect(result.current.hasFailed).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
  });

  it("has failed, listing nothing, when the imports lookup fails", async () => {
    mocks.isErrorImports = true;

    const { result } = _renderRows();
    await _flush();

    expect(result.current.hasFailed).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
  });

  it.each([
    ["imports", "isErrorImports", "isFetchingImports"],
    ["datasets", "isErrorDatasets", "isFetchingDatasets"],
  ] as const)(
    "is loading, not failed, while a failed %s lookup is retried",
    async (_label, errorFlag, fetchingFlag) => {
      mocks[errorFlag] = true;
      const { result, rerender } = _renderRows();
      await _flush();
      expect(result.current.hasFailed).toBe(true);

      // A query with no data drops its error as soon as the retry starts.
      mocks[errorFlag] = false;
      mocks[fetchingFlag] = true;
      rerender();

      expect(result.current.hasFailed).toBe(false);
      expect(result.current.isRetrying).toBe(true);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.rows).toEqual([]);
    },
  );

  it("keeps the failure retrying, not failed, when a retried query keeps its error", async () => {
    mocks.isErrorDatasets = true;
    const { result, rerender } = _renderRows();
    await _flush();

    mocks.isFetchingDatasets = true;
    rerender();

    expect(result.current.hasFailed).toBe(false);
    expect(result.current.isRetrying).toBe(true);
  });

  it("is not retrying while a first load is in flight", async () => {
    mocks.isFetchingDatasets = true;

    const { result } = _renderRows();
    await _flush();

    expect(result.current.isRetrying).toBe(false);
  });

  it("is loading, not failed, while a failed access check is retried", async () => {
    mocks.canAccessResource.mockRejectedValue(new Error("rpc failed"));
    const { result } = _renderRows();
    await waitFor(() => {
      expect(result.current.hasFailed).toBe(true);
    });
    mocks.canAccessResource.mockImplementation(() => {
      return new Promise(() => {});
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isRetrying).toBe(true);
    });
    expect(result.current.hasFailed).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toEqual([]);
  });

  it("lists nothing and checks no access while a restored imports list refetches", async () => {
    mocks.isFetchingImports = true;

    const { result } = _renderRows();
    await _flush();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
  });

  it("retries only the dataset lookup when that is what failed", async () => {
    mocks.isErrorDatasets = true;
    const { result } = _renderRows();
    await _flush();

    act(() => {
      result.current.retry();
    });

    expect(mocks.refetchDatasets).toHaveBeenCalledTimes(1);
    expect(mocks.refetchImports).not.toHaveBeenCalled();
  });

  it("retries only the imports lookup when that is what failed", async () => {
    mocks.isErrorImports = true;
    const { result } = _renderRows();
    await _flush();

    act(() => {
      result.current.retry();
    });

    expect(mocks.refetchImports).toHaveBeenCalledTimes(1);
    expect(mocks.refetchDatasets).not.toHaveBeenCalled();
  });

  it("retries only the access checks that failed, and then lists the rows", async () => {
    let hasProvincesFailed = true;
    mocks.canAccessResource.mockImplementation(
      async ({ resourceId }: { resourceId: string }) => {
        if (resourceId === "dataset-provinces" && hasProvincesFailed) {
          throw new Error("rpc failed");
        }
        return true;
      },
    );
    const { result } = _renderRows();
    await waitFor(() => {
      expect(result.current.hasFailed).toBe(true);
    });
    mocks.canAccessResource.mockClear();
    hasProvincesFailed = false;

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.rows).toHaveLength(2);
    });
    expect(result.current.hasFailed).toBe(false);
    expect(mocks.canAccessResource).toHaveBeenCalledTimes(1);
    expect(mocks.canAccessResource).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: "dataset-provinces" }),
    );
    expect(mocks.refetchImports).not.toHaveBeenCalled();
    expect(mocks.refetchDatasets).not.toHaveBeenCalled();
  });

  it("asks for the imported datasets and always refetches them on mount", () => {
    _renderRows();

    expect(mocks.datasetsArgs).toMatchObject({
      where: { id: { in: ["dataset-provinces", "dataset-districts"] } },
      useQueryOptions: { refetchOnMount: "always", enabled: true },
    });
  });

  it("keeps the access answers out of the persisted cache and drops them when unused", async () => {
    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const accessQueries = queryClient.getQueryCache().getAll();
    expect(accessQueries).toHaveLength(2);
    accessQueries.forEach((query) => {
      expect(query.meta).toEqual({ persist: false });
      expect(query.observers[0]?.options.gcTime).toBe(0);
      expect(query.observers[0]?.options.staleTime).toBe(0);
    });
  });

  it("lists nothing, loads nothing and checks no access when the plugin imported nothing", async () => {
    mocks.importsByContentId = {};
    mocks.datasets = [];

    const { result } = _renderRows();
    await _flush();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
    expect(mocks.datasetsArgs).toMatchObject({
      where: { id: { in: [] } },
      useQueryOptions: { refetchOnMount: "always", enabled: false },
    });
  });
});
