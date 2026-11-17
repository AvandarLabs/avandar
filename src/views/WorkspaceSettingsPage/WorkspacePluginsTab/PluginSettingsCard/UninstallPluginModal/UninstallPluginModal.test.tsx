import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    rows: [] as Array<{ datasetId: string; name: string; canDelete: boolean }>,
    hiddenCount: 0,
    uninstall: vi.fn(),
    keepOpen: vi.fn(),
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
    notifyError: vi.fn(),
    onClose: vi.fn(),
  };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows",
  () => {
    return {
      useUninstallContentRows: () => {
        return {
          rows: mocks.rows,
          hiddenCount: mocks.hiddenCount,
          isLoading: false,
        };
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents",
  () => {
    return {
      UninstallDatasetDependents: ({ datasetId }: { datasetId: string }) => {
        return <p>{`dependents of ${datasetId}`}</p>;
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets",
  () => {
    return { uninstallPluginAndDeleteDatasets: mocks.uninstall };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile",
  () => {
    return { useKeepModalOpenWhile: mocks.keepOpen };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: mocks.notifySuccess,
    notifyWarning: mocks.notifyWarning,
    notifyError: mocks.notifyError,
  };
});

function _renderModal(): void {
  const queryClient = new QueryClient();
  render(
    <UninstallPluginModal
      pluginName="Mozambique"
      pluginId="avandar.mozambique"
      installationId={"installation-1" as PluginInstallation.Id}
      modalId="modal-1"
      onClose={mocks.onClose}
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => {
        return (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        );
      },
    },
  );
}

describe("UninstallPluginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [
      { datasetId: "dataset-districts", name: "Mozambique districts", canDelete: true },
      { datasetId: "dataset-provinces", name: "Mozambique provinces", canDelete: true },
      { datasetId: "dataset-facilities", name: "Health facilities", canDelete: false },
    ];
    mocks.hiddenCount = 0;
    mocks.uninstall.mockResolvedValue({ failedDatasetIds: [] });
  });

  it("starts with every dataset kept", () => {
    _renderModal();

    screen.getAllByRole("checkbox").forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });
    expect(screen.getByRole("button", { name: "Uninstall" })).toBeEnabled();
  });

  it("gives a dataset the user cannot delete no checkbox and says why", () => {
    _renderModal();

    expect(
      screen.queryByRole("checkbox", { name: "Delete Health facilities" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Kept. Only a dataset admin can delete it."),
    ).toBeInTheDocument();
  });

  it("counts the datasets the user cannot see", () => {
    mocks.hiddenCount = 2;

    _renderModal();

    expect(
      screen.getByText("2 more datasets you can't see stay."),
    ).toBeInTheDocument();
  });

  it("shows what reads a dataset only once it is checked, and names the count on the button", () => {
    _renderModal();
    expect(
      screen.queryByText("dependents of dataset-districts"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
    );

    expect(
      screen.getByText("dependents of dataset-districts"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
    ).toBeInTheDocument();
  });

  it("uninstalls and deletes the checked datasets in the order shown, then closes", async () => {
    _renderModal();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Delete Mozambique provinces" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Uninstall and delete 2 datasets" }),
    );

    await waitFor(() => {
      expect(mocks.onClose).toHaveBeenCalledTimes(1);
    });
    expect(mocks.uninstall).toHaveBeenCalledWith({
      installationId: "installation-1",
      datasetIds: ["dataset-districts", "dataset-provinces"],
    });
    expect(mocks.notifySuccess).toHaveBeenCalledWith({
      title: "Mozambique uninstalled",
      message: "2 datasets deleted.",
    });
  });

  it("keeps the modal open and the buttons disabled while it runs", async () => {
    let finish: (value: { failedDatasetIds: string[] }) => void = () => {};
    mocks.uninstall.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.keepOpen).toHaveBeenLastCalledWith(true, "modal-1");
    });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    finish({ failedDatasetIds: [] });
    await waitFor(() => {
      expect(mocks.onClose).toHaveBeenCalled();
    });
  });

  it("warns with the names of the datasets it could not delete", async () => {
    mocks.uninstall.mockResolvedValue({
      failedDatasetIds: ["dataset-districts"],
    });
    _renderModal();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
    );

    await waitFor(() => {
      expect(mocks.notifyWarning).toHaveBeenCalledWith({
        title: "Mozambique uninstalled",
        message:
          "These datasets could not be deleted and are still in Data Sources: Mozambique districts",
      });
    });
  });

  it("stays open and reports the error when the uninstall fails", async () => {
    mocks.uninstall.mockRejectedValue(new Error("not allowed"));
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith({
        title: "Could not update Mozambique",
        message: "not allowed",
      });
    });
    expect(mocks.onClose).not.toHaveBeenCalled();
  });

  it("says only that the plugin was uninstalled when nothing was deleted", async () => {
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.notifySuccess).toHaveBeenCalledWith(
        "Mozambique uninstalled",
      );
    });
  });
});
