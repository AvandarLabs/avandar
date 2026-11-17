import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { PluginContentImportClient } from "@/clients/plugins/PluginContentImportClient/PluginContentImportClient";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { UninstallPluginError } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/UninstallPluginError";
import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    rows: [] as Array<{ datasetId: string; name: string; canDelete: boolean }>,
    hiddenCount: 0,
    isLoading: false,
    hasDependents: true,
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
          isLoading: mocks.isLoading,
        };
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents/UninstallDatasetDependents",
  () => {
    return {
      UninstallDatasetDependents: ({ datasetId }: { datasetId: string }) => {
        return mocks.hasDependents ? <p>{`dependents of ${datasetId}`}</p> : null;
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

type UninstallOutcomeStub = {
  deletedDatasetIds: string[];
  failedDatasetIds: string[];
};

function _renderModal(): QueryClient {
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
  return queryClient;
}

function _checkDataset(name: string): void {
  fireEvent.click(screen.getByRole("checkbox", { name: `Delete ${name}` }));
}

describe("UninstallPluginModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [
      {
        datasetId: "dataset-districts",
        name: "Mozambique districts",
        canDelete: true,
      },
      {
        datasetId: "dataset-provinces",
        name: "Mozambique provinces",
        canDelete: true,
      },
      {
        datasetId: "dataset-facilities",
        name: "Health facilities",
        canDelete: false,
      },
    ];
    mocks.hiddenCount = 0;
    mocks.isLoading = false;
    mocks.hasDependents = true;
    mocks.uninstall.mockImplementation(
      async ({ datasetIds }: { datasetIds: string[] }) => {
        return { deletedDatasetIds: datasetIds, failedDatasetIds: [] };
      },
    );
  });

  it("starts with every dataset kept", () => {
    _renderModal();

    screen.getAllByRole("checkbox").forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });
    expect(screen.getByRole("button", { name: "Uninstall" })).toBeEnabled();
  });

  it("gives a dataset the user cannot delete no checkbox", () => {
    _renderModal();

    expect(
      screen.queryByRole("checkbox", { name: "Delete Health facilities" }),
    ).not.toBeInTheDocument();
  });

  it("says why a dataset the user cannot delete is kept", () => {
    _renderModal();

    expect(
      screen.getByText("Kept. Only a dataset admin can delete it."),
    ).toBeInTheDocument();
  });

  it("names the list of datasets by the heading above it", () => {
    _renderModal();

    expect(
      screen.getByRole("group", { name: "Datasets it imported" }),
    ).toBeInTheDocument();
  });

  it("counts the datasets the user cannot see", () => {
    mocks.hiddenCount = 2;

    _renderModal();

    expect(
      screen.getByText("2 more datasets you can't see stay."),
    ).toBeInTheDocument();
  });

  it("shows a loader and no list while the datasets load", () => {
    mocks.isLoading = true;

    _renderModal();

    expect(
      screen.getByRole("status", { name: "Loading datasets" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("disables the confirm button while the datasets load", () => {
    mocks.isLoading = true;

    _renderModal();

    expect(screen.getByRole("button", { name: "Uninstall" })).toBeDisabled();
  });

  it("leaves out the list when the plugin imported no datasets", () => {
    mocks.rows = [];

    _renderModal();

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("says unchecked datasets stay when one can be deleted", () => {
    _renderModal();

    expect(
      screen.getByText("Unchecked datasets stay in Data Sources."),
    ).toBeInTheDocument();
  });

  it("leaves out the note that unchecked datasets stay when none can be deleted", () => {
    mocks.rows = [
      {
        datasetId: "dataset-facilities",
        name: "Health facilities",
        canDelete: false,
      },
    ];

    _renderModal();

    expect(
      screen.queryByText("Unchecked datasets stay in Data Sources."),
    ).not.toBeInTheDocument();
  });

  it("hides what reads a dataset until it is checked", () => {
    _renderModal();

    expect(
      screen.queryByText("dependents of dataset-districts"),
    ).not.toBeInTheDocument();
  });

  it("shows what reads a dataset once it is checked", () => {
    _renderModal();

    _checkDataset("Mozambique districts");

    expect(
      screen.getByText("dependents of dataset-districts"),
    ).toBeInTheDocument();
  });

  it("adds no empty element under a checked dataset that nothing reads", () => {
    mocks.hasDependents = false;
    _renderModal();

    _checkDataset("Mozambique districts");

    const checkboxRoot = screen
      .getByRole("checkbox", { name: "Delete Mozambique districts" })
      .closest(".mantine-Checkbox-root");
    expect(checkboxRoot?.parentElement?.children).toHaveLength(1);
  });

  it("names the number of checked datasets on the confirm button", () => {
    _renderModal();

    _checkDataset("Mozambique districts");

    expect(
      screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
    ).toBeInTheDocument();
  });

  it("calls onClose when Cancel is pressed", () => {
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.onClose).toHaveBeenCalledTimes(1);
  });

  it("deletes the checked datasets in the order shown", async () => {
    _renderModal();
    _checkDataset("Mozambique provinces");
    _checkDataset("Mozambique districts");

    fireEvent.click(
      screen.getByRole("button", { name: "Uninstall and delete 2 datasets" }),
    );

    await waitFor(() => {
      expect(mocks.uninstall).toHaveBeenCalledWith({
        installationId: "installation-1",
        datasetIds: ["dataset-districts", "dataset-provinces"],
      });
    });
  });

  it("leaves out a dataset that was checked and then can no longer be deleted", async () => {
    _renderModal();
    _checkDataset("Mozambique districts");
    // The admin loses the right to delete it. The next render reads the row.
    mocks.rows = mocks.rows.map((row) => {
      return row.datasetId === "dataset-districts"
        ? { ...row, canDelete: false }
        : row;
    });
    _checkDataset("Mozambique provinces");

    fireEvent.click(
      screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
    );

    await waitFor(() => {
      expect(mocks.uninstall).toHaveBeenCalledWith({
        installationId: "installation-1",
        datasetIds: ["dataset-provinces"],
      });
    });
  });

  it("closes as uninstalled once the uninstall finishes, and as cancelled on Cancel", async () => {
    _renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mocks.onClose).toHaveBeenLastCalledWith("cancelled");

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.onClose).toHaveBeenLastCalledWith("uninstalled");
    });
  });

  it("closes the modal once the uninstall finishes", async () => {
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it("reports how many datasets were deleted", async () => {
    _renderModal();
    _checkDataset("Mozambique provinces");
    _checkDataset("Mozambique districts");

    fireEvent.click(
      screen.getByRole("button", { name: "Uninstall and delete 2 datasets" }),
    );

    await waitFor(() => {
      expect(mocks.notifySuccess).toHaveBeenCalledWith({
        title: "Mozambique uninstalled",
        message: "2 datasets deleted.",
      });
    });
  });

  describe("while the uninstall runs", () => {
    let finish: (value: UninstallOutcomeStub) => void = () => {};

    beforeEach(() => {
      mocks.uninstall.mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        }),
      );
    });

    afterEach(async () => {
      finish({ deletedDatasetIds: [], failedDatasetIds: [] });
      await waitFor(() => {
        expect(mocks.onClose).toHaveBeenCalled();
      });
    });

    it("keeps the modal open", async () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.keepOpen).toHaveBeenLastCalledWith(true, "modal-1");
      });
    });

    it("disables Cancel", async () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      });
    });

    it("shows the confirm button loading and disabled", async () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Uninstall" }),
        ).toBeDisabled();
      });
      expect(screen.getByRole("button", { name: "Uninstall" })).toHaveAttribute(
        "data-loading",
        "true",
      );
    });

    it("disables the dataset checkboxes", async () => {
      _renderModal();
      _checkDataset("Mozambique districts");

      fireEvent.click(
        screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("checkbox", { name: "Delete Mozambique provinces" }),
        ).toBeDisabled();
      });
    });
  });

  it("warns with the names of the datasets it could not delete", async () => {
    mocks.uninstall.mockResolvedValue({
      deletedDatasetIds: [],
      failedDatasetIds: ["dataset-districts"],
    });
    _renderModal();
    _checkDataset("Mozambique districts");

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

  it("reports the error when the uninstall fails", async () => {
    mocks.uninstall.mockRejectedValue(new Error("not allowed"));
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith({
        title: "Could not update Mozambique",
        message: "not allowed",
      });
    });
  });

  it("explains in plain words that the plugin is still installed, not the log message", async () => {
    mocks.uninstall.mockRejectedValue(
      new UninstallPluginError({
        installationId: "installation-1" as PluginInstallation.Id,
        reason: "still_installed",
      }),
    );
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith({
        title: "Could not update Mozambique",
        message:
          "Mozambique is still installed. You may not have permission to uninstall it.",
      });
    });
  });

  it("asks the admin to check the plugin list when the uninstall could not be confirmed", async () => {
    mocks.uninstall.mockRejectedValue(
      new UninstallPluginError({
        installationId: "installation-1" as PluginInstallation.Id,
        reason: "not_confirmed",
      }),
    );
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalledWith({
        title: "Could not update Mozambique",
        message:
          "We could not confirm the uninstall. Check the plugin list, then try again.",
      });
    });
  });

  it("stays open when the uninstall fails", async () => {
    mocks.uninstall.mockRejectedValue(new Error("not allowed"));
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

    await waitFor(() => {
      expect(mocks.notifyError).toHaveBeenCalled();
    });
    expect(mocks.onClose).not.toHaveBeenCalled();
  });

  it("does not count a checked dataset that was already gone as deleted", async () => {
    mocks.uninstall.mockResolvedValue({
      deletedDatasetIds: [],
      failedDatasetIds: [],
    });
    _renderModal();
    _checkDataset("Mozambique districts");

    fireEvent.click(
      screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
    );

    await waitFor(() => {
      expect(mocks.notifySuccess).toHaveBeenCalledWith("Mozambique uninstalled");
    });
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

  describe("refreshing the lists an uninstall changes", () => {
    const expectedQueryKeys = [
      PluginInstallationClient.QueryKeys.getAll(),
      PluginContentImportClient.QueryKeys.getAll(),
      PluginDataSlotBindingClient.QueryKeys.getAll(),
      DatasetClient.QueryKeys.getAll(),
    ];

    it("invalidates the plugin and dataset lists after a successful run", async () => {
      const queryClient = _renderModal();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.onClose).toHaveBeenCalled();
      });
      expectedQueryKeys.forEach((queryKey) => {
        expect(invalidate).toHaveBeenCalledWith({ queryKey });
      });
    });

    it("invalidates them when the uninstall fails, so a deleted install is not shown", async () => {
      mocks.uninstall.mockRejectedValue(new Error("could not verify"));
      const queryClient = _renderModal();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.notifyError).toHaveBeenCalled();
      });
      expectedQueryKeys.forEach((queryKey) => {
        expect(invalidate).toHaveBeenCalledWith({ queryKey });
      });
    });
  });
});
