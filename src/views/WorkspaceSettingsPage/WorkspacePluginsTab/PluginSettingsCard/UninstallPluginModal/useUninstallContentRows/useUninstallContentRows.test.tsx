import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders, waitFor } from "@/test-utils";
import { useUninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    importsByContentId: {} as Record<string, { datasetId: string }>,
    datasets: [] as Array<{ id: string; name: string }>,
    isFetchingDatasets: false,
    canAccessResource: vi.fn(),
  };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent",
  () => {
    return {
      useImportedPluginContent: () => {
        return {
          importsByContentId: mocks.importsByContentId,
          isLoading: false,
        };
      },
    };
  },
);
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [
          mocks.datasets,
          false,
          { isFetching: mocks.isFetchingDatasets },
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
    mocks.canAccessResource.mockReset();
    mocks.canAccessResource.mockResolvedValue(true);
  });

  it("names each row after the dataset's current name, sorted by name", async () => {
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

  it("treats a failed access check as not deletable", async () => {
    mocks.canAccessResource.mockRejectedValue(new Error("rpc failed"));

    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(
      result.current.rows.every((row) => {
        return !row.canDelete;
      }),
    ).toBe(true);
  });

  it("stays loading until every access check has answered", async () => {
    mocks.canAccessResource.mockImplementation(() => {
      return new Promise(() => {});
    });

    const { result } = _renderRows();

    expect(result.current.isLoading).toBe(true);
  });

  it("stays loading and checks no access while the dataset refetch is in flight", async () => {
    mocks.isFetchingDatasets = true;

    const { result } = _renderRows();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.rows).toEqual([]);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
  });

  it("lists nothing and is not loading when the plugin imported nothing", async () => {
    mocks.importsByContentId = {};
    mocks.datasets = [];

    const { result } = _renderRows();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.rows).toEqual([]);
    expect(result.current.hiddenCount).toBe(0);
    expect(mocks.canAccessResource).not.toHaveBeenCalled();
  });
});
