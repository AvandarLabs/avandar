import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";

const mocks = vi.hoisted(() => {
  return { refetch: vi.fn() };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
  () => {
    return {
      PluginContentImportClient: {
        useGetAll: () => {
          return [
            [{ contentId: "provinces", datasetId: "dataset-provinces" }],
            false,
            { isFetching: false, isError: true, refetch: mocks.refetch },
          ];
        },
      },
    };
  },
);

describe("useImportedPluginContent", () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.refetch.mockResolvedValue({});
  });

  it("asks the imports lookup again when refetch is called", () => {
    const { result } = renderHook(() => {
      return useImportedPluginContent("avandar.mozambique");
    });

    result.current.refetch();

    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});
