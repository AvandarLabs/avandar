import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent/useImportedPluginContent";

const mocks = vi.hoisted(() => {
  return {
    refetch: vi.fn(),
    isFetching: false,
    isError: false,
  };
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
            {
              isFetching: mocks.isFetching,
              isError: mocks.isError,
              refetch: mocks.refetch,
            },
          ];
        },
      },
    };
  },
);

function _renderImportedContent() {
  return renderHook(() => {
    return useImportedPluginContent("avandar.mozambique");
  });
}

describe("useImportedPluginContent", () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.refetch.mockResolvedValue({});
    mocks.isFetching = false;
    mocks.isError = false;
  });

  it("asks the imports lookup again when refetch is called", () => {
    const { result } = _renderImportedContent();

    result.current.refetch();

    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("has failed once a failed lookup is no longer in flight", () => {
    mocks.isError = true;

    const { result } = _renderImportedContent();

    expect(result.current.hasFailed).toBe(true);
  });

  it("has not failed while a failed lookup is retried", () => {
    mocks.isError = true;
    mocks.isFetching = true;

    const { result } = _renderImportedContent();

    expect(result.current.hasFailed).toBe(false);
  });

  it("has not failed when the lookup succeeded", () => {
    const { result } = _renderImportedContent();

    expect(result.current.hasFailed).toBe(false);
  });
});
