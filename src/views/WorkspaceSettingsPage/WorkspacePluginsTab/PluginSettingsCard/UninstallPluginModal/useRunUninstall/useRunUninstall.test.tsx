import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { act, renderHook } from "@/test-utils";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import { useRunUninstall } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useRunUninstall/useRunUninstall";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    uninstall: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
    notifyError: vi.fn(),
    onDone: vi.fn(),
  };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets",
  () => {
    return { uninstallPluginAndDeleteDatasets: mocks.uninstall };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: mocks.notifySuccess,
    notifyWarning: mocks.notifyWarning,
    notifyError: mocks.notifyError,
  };
});

const INSTALLATION_ID = "installation-1" as PluginInstallation.Id;
const DISTRICTS_ID = "dataset-districts" as Dataset.Id;
const PROVINCES_ID = "dataset-provinces" as Dataset.Id;
const ROWS: UninstallContentRow[] = [
  { datasetId: DISTRICTS_ID, name: "Mozambique districts", canDelete: true },
  { datasetId: PROVINCES_ID, name: "Mozambique provinces", canDelete: true },
];

type Rendered = {
  queryClient: QueryClient;
  run: (datasetIds?: readonly Dataset.Id[]) => Promise<void>;
};

function _renderRunUninstall(): Rendered {
  const queryClient = new QueryClient();
  const { result } = renderHook(
    () => {
      return useRunUninstall({
        pluginName: "Mozambique",
        installationId: INSTALLATION_ID,
        rows: ROWS,
        onDone: mocks.onDone,
      });
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <I18nProvider i18n={i18n}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </I18nProvider>
        );
      },
    },
  );
  return {
    queryClient,
    run: async (datasetIds = []) => {
      await act(async () => {
        await result.current.run(datasetIds);
      });
    },
  };
}

describe("useRunUninstall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.uninstall.mockImplementation(
      async ({ datasetIds }: { datasetIds: Dataset.Id[] }) => {
        return { deletedDatasetIds: datasetIds, failedDatasetIds: [] };
      },
    );
  });

  it("reports how many datasets were deleted", async () => {
    const { run } = _renderRunUninstall();

    await run([PROVINCES_ID, DISTRICTS_ID]);

    expect(mocks.notifySuccess).toHaveBeenCalledWith({
      title: "Mozambique uninstalled",
      message: "2 datasets deleted.",
    });
  });

  it("warns with the names of the datasets it could not delete", async () => {
    mocks.uninstall.mockResolvedValue({
      deletedDatasetIds: [],
      failedDatasetIds: [DISTRICTS_ID],
    });
    const { run } = _renderRunUninstall();

    await run([DISTRICTS_ID]);

    expect(mocks.notifyWarning).toHaveBeenCalledWith({
      title: "Mozambique uninstalled",
      message:
        "These datasets could not be deleted and are still in Data Sources: Mozambique districts",
    });
  });

  it("does not count a checked dataset that was already gone as deleted", async () => {
    mocks.uninstall.mockResolvedValue({
      deletedDatasetIds: [],
      failedDatasetIds: [],
    });
    const { run } = _renderRunUninstall();

    await run([DISTRICTS_ID]);

    expect(mocks.notifySuccess).toHaveBeenCalledWith("Mozambique uninstalled");
  });

  it("says only that the plugin was uninstalled when nothing was deleted", async () => {
    const { run } = _renderRunUninstall();

    await run([]);

    expect(mocks.notifySuccess).toHaveBeenCalledWith("Mozambique uninstalled");
  });

  it("explains in plain words that the plugin is still installed, not the log message", async () => {
    mocks.uninstall.mockRejectedValue(
      new UninstallPluginError({
        installationId: INSTALLATION_ID,
        reason: "still_installed",
      }),
    );
    const { run } = _renderRunUninstall();

    await run();

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not update Mozambique",
      message:
        "Mozambique is still installed. You may not have permission to uninstall it.",
    });
  });

  it("asks the admin to check the plugin list when the uninstall could not be confirmed", async () => {
    mocks.uninstall.mockRejectedValue(
      new UninstallPluginError({
        installationId: INSTALLATION_ID,
        reason: "not_confirmed",
      }),
    );
    const { run } = _renderRunUninstall();

    await run();

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not update Mozambique",
      message:
        "We could not confirm the uninstall. Check the plugin list, then try again.",
    });
  });

  it("reports the error when the uninstall fails", async () => {
    mocks.uninstall.mockRejectedValue(new Error("not allowed"));
    const { run } = _renderRunUninstall();

    await run();

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not update Mozambique",
      message: "not allowed",
    });
  });

  it("does not call onDone when the uninstall fails", async () => {
    mocks.uninstall.mockRejectedValue(new Error("not allowed"));
    const { run } = _renderRunUninstall();

    await run();

    expect(mocks.onDone).not.toHaveBeenCalled();
  });

  describe("refreshing the lists an uninstall changes", () => {
    const expectedQueryKeys = [
      PluginInstallationClient.QueryKeys.getAll(),
      PluginContentImportClient.QueryKeys.getAll(),
      PluginDataSlotBindingClient.QueryKeys.getAll(),
      DatasetClient.QueryKeys.getAll(),
    ];

    it("invalidates the plugin and dataset lists after a successful run", async () => {
      const { queryClient, run } = _renderRunUninstall();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");

      await run();

      expectedQueryKeys.forEach((queryKey) => {
        expect(invalidate).toHaveBeenCalledWith({ queryKey });
      });
    });

    it("invalidates them when the uninstall fails, so a deleted install is not shown", async () => {
      mocks.uninstall.mockRejectedValue(new Error("could not verify"));
      const { queryClient, run } = _renderRunUninstall();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");

      await run();

      expectedQueryKeys.forEach((queryKey) => {
        expect(invalidate).toHaveBeenCalledWith({ queryKey });
      });
    });
  });
});
