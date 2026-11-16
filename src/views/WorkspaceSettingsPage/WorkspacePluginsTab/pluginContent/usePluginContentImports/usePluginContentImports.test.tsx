import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { act, renderHook, TestProviders, waitFor } from "@/test-utils";
import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginContentItem } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    importPluginContentItem: vi.fn(),
    contentUrls: {} as Record<string, string>,
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-id" };
    },
  };
});
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: () => {
      return {
        loadContentUrls: () => {
          return Promise.resolve(mocks.contentUrls);
        },
      };
    },
  };
});
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
  () => {
    return { importPluginContentItem: mocks.importPluginContentItem };
  },
);

const PROVINCES: PluginContentItem = {
  id: "provinces",
  kind: "dataset",
  title: "%content.provinces.title%",
  description: "%content.provinces.description%",
  file: "content/mz-adm1.csv",
};

const DISTRICTS: PluginContentItem = {
  id: "districts",
  kind: "dataset",
  title: "%content.districts.title%",
  description: "%content.districts.description%",
  file: "content/mz-adm2.csv",
};

const MANIFEST_MODULE = {
  manifest: {
    id: "avandar.mozambique",
    contributes: { content: [PROVINCES, DISTRICTS] },
  },
  strings: {
    en: {
      "content.provinces.title": "Mozambique provinces",
      "content.provinces.description": "Province boundaries.",
      "content.districts.title": "Mozambique districts",
      "content.districts.description": "District boundaries.",
    },
  },
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <TestProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestProviders>
  );
}

function _renderImports(): {
  result: { current: ReturnType<typeof usePluginContentImports> };
} {
  return renderHook(
    () => {
      return usePluginContentImports(MANIFEST_MODULE);
    },
    { wrapper: Wrapper },
  );
}

describe("usePluginContentImports", () => {
  beforeEach(() => {
    mocks.importPluginContentItem.mockReset();
    mocks.contentUrls = {
      provinces: "/assets/mz-adm1.csv",
      districts: "/assets/mz-adm2.csv",
    };
    queryClient = new QueryClient();
  });

  it("imports each item with its file's URL and its name and description in the reader's language", async () => {
    mocks.importPluginContentItem.mockResolvedValue("dataset-id");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(mocks.importPluginContentItem).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      userId: "user-id",
      pluginId: "avandar.mozambique",
      item: PROVINCES,
      datasetName: "Mozambique provinces",
      datasetDescription: "Province boundaries.",
      url: "/assets/mz-adm1.csv",
    });
  });

  it("imports one item at a time, waiting for each to finish", async () => {
    let finishProvinces: (datasetId: string) => void = () => {};
    mocks.importPluginContentItem.mockImplementation(({ item }) => {
      return item.id === "provinces"
        ? new Promise((resolve) => {
            finishProvinces = resolve;
          })
        : Promise.resolve("districts-dataset");
    });
    const { result } = _renderImports();

    act(() => {
      void result.current.importItems([PROVINCES, DISTRICTS]);
    });
    await waitFor(() => {
      expect(result.current.statusesByContentId.provinces).toEqual({
        kind: "importing",
      });
    });
    expect(result.current.statusesByContentId.districts).toEqual({
      kind: "pending",
    });
    expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishProvinces("provinces-dataset");
    });

    await waitFor(() => {
      expect(result.current.statusesByContentId.districts).toEqual({
        kind: "done",
        datasetId: "districts-dataset",
      });
    });
  });

  it("goes on with the next item when one fails, and keeps the reason", async () => {
    mocks.importPluginContentItem
      .mockRejectedValueOnce(new Error("permission denied for datasets"))
      .mockResolvedValueOnce("districts-dataset");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES, DISTRICTS]);
    });

    expect(result.current.statusesByContentId).toEqual({
      provinces: { kind: "failed", reason: "permission denied for datasets" },
      districts: { kind: "done", datasetId: "districts-dataset" },
    });
    expect(result.current.isImporting).toBe(false);
  });

  it("retries a failed item on its own", async () => {
    mocks.importPluginContentItem
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce("provinces-dataset");
    const { result } = _renderImports();
    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(result.current.statusesByContentId.provinces).toEqual({
      kind: "done",
      datasetId: "provinces-dataset",
    });
    expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(2);
  });

  it("fails an item whose bundled file the plugin no longer has", async () => {
    mocks.contentUrls = { provinces: "/assets/mz-adm1.csv" };
    mocks.importPluginContentItem.mockResolvedValue("provinces-dataset");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([DISTRICTS]);
    });

    expect(result.current.statusesByContentId.districts).toEqual({
      kind: "failed",
      reason: "This plugin no longer includes content/mz-adm2.csv.",
    });
    expect(mocks.importPluginContentItem).not.toHaveBeenCalled();
  });

  it("fails an item whose id is an inherited object key and has no bundled file", async () => {
    mocks.contentUrls = {};
    const inheritedKeyItem: PluginContentItem = {
      ...PROVINCES,
      id: "constructor",
    };
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([inheritedKeyItem]);
    });

    expect(result.current.statusesByContentId.constructor).toEqual({
      kind: "failed",
      reason: "This plugin no longer includes content/mz-adm1.csv.",
    });
    expect(mocks.importPluginContentItem).not.toHaveBeenCalled();
  });

  it("refreshes the workspace's imported content after an item is imported", async () => {
    mocks.importPluginContentItem.mockResolvedValue("provinces-dataset");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: PluginContentImportClient.QueryKeys.getAll(),
    });
  });

  it("refreshes the workspace's dataset lists after an item is imported", async () => {
    mocks.importPluginContentItem.mockResolvedValue("provinces-dataset");
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = _renderImports();

    await act(async () => {
      await result.current.importItems([PROVINCES]);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: DatasetClient.QueryKeys.getAll(),
    });
  });
});
