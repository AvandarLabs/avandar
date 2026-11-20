import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    rows: [] as Array<{ datasetId: string; name: string; canDelete: boolean }>,
    hiddenCount: 0,
    isLoading: false,
    hasFailed: false,
    isRetrying: false,
    retry: vi.fn(),
    hasDependents: true,
    isLoadingDependents: false,
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
          hasFailed: mocks.hasFailed,
          isRetrying: mocks.isRetrying,
          retry: mocks.retry,
        };
      },
    };
  },
);
// The stand-in reports through the real context, as the real row does.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents/UninstallDatasetDependents",
  async () => {
    const { useReportDependentsLoading } =
      await import("@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDependentsLoading/useDependentsLoading");
    return {
      UninstallDatasetDependents: ({ datasetId }: { datasetId: string }) => {
        useReportDependentsLoading({
          datasetId: datasetId as never,
          isLoading: mocks.isLoadingDependents,
        });
        return mocks.hasDependents ? (
          <p>{`dependents of ${datasetId}`}</p>
        ) : null;
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
  refusedDatasetIds: string[];
  incompleteDatasetIds: string[];
  unreadDatasetIds: string[];
};

function _buildModal(): JSX.Element {
  return (
    <UninstallPluginModal
      pluginName="Mozambique"
      pluginId="avandar.mozambique"
      installationId={"installation-1" as PluginInstallation.Id}
      modalId="modal-1"
      onClose={mocks.onClose}
    />
  );
}

function _renderModal(): { rerenderModal: () => void } {
  const queryClient = new QueryClient();
  const { rerender } = render(_buildModal(), {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
  return {
    rerenderModal: () => {
      rerender(_buildModal());
    },
  };
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
    mocks.hasFailed = false;
    mocks.isRetrying = false;
    mocks.hasDependents = true;
    mocks.isLoadingDependents = false;
    mocks.uninstall.mockImplementation(
      async ({ datasetIds }: { datasetIds: string[] }) => {
        return {
          deletedDatasetIds: datasetIds,
          refusedDatasetIds: [],
          incompleteDatasetIds: [],
          unreadDatasetIds: [],
        };
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

  it("closes as cancelled on Cancel", () => {
    _renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.onClose).toHaveBeenLastCalledWith("cancelled");
  });

  it("closes as uninstalled once the uninstall finishes", async () => {
    _renderModal();

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

  describe("while what reads a checked dataset loads", () => {
    beforeEach(() => {
      mocks.isLoadingDependents = true;
    });

    it("keeps the confirm button disabled", () => {
      _renderModal();

      _checkDataset("Mozambique districts");

      expect(
        screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
      ).toBeDisabled();
    });

    it("enables the confirm button once it has loaded", () => {
      const { rerenderModal } = _renderModal();
      _checkDataset("Mozambique districts");

      mocks.isLoadingDependents = false;
      rerenderModal();

      expect(
        screen.getByRole("button", { name: "Uninstall and delete 1 dataset" }),
      ).toBeEnabled();
    });

    it("enables the confirm button when the dataset is unchecked", () => {
      _renderModal();
      _checkDataset("Mozambique districts");

      _checkDataset("Mozambique districts");

      expect(screen.getByRole("button", { name: "Uninstall" })).toBeEnabled();
    });

    it("does not wait for a dataset that is not checked", () => {
      _renderModal();

      expect(screen.getByRole("button", { name: "Uninstall" })).toBeEnabled();
    });
  });

  describe("when a lookup of the datasets failed", () => {
    beforeEach(() => {
      mocks.hasFailed = true;
      mocks.rows = [];
    });

    it("says the datasets could not be loaded, in an alert", () => {
      _renderModal();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "We could not load the datasets this plugin imported.",
      );
    });

    it("asks to look the datasets up again when Retry is pressed", () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(mocks.retry).toHaveBeenCalledTimes(1);
    });

    it("claims neither unseen datasets nor datasets only an admin can delete", () => {
      mocks.hiddenCount = 2;
      mocks.rows = [
        {
          datasetId: "dataset-facilities",
          name: "Health facilities",
          canDelete: false,
        },
      ];

      _renderModal();

      expect(screen.queryByText(/you can't see/)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Only a dataset admin/),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
    });

    it("offers an enabled uninstall that keeps every dataset", () => {
      _renderModal();

      expect(
        screen.getByRole("button", { name: "Uninstall and keep all datasets" }),
      ).toBeEnabled();
    });

    it("says every dataset stays in Data Sources", () => {
      _renderModal();

      expect(
        screen.getByText("Every dataset it imported stays in Data Sources."),
      ).toBeInTheDocument();
    });

    it("leaves out the note about unchecked datasets", () => {
      _renderModal();

      expect(
        screen.queryByText("Unchecked datasets stay in Data Sources."),
      ).not.toBeInTheDocument();
    });

    it("deletes no dataset on confirm, even for one that was checked before the failure", async () => {
      mocks.hasFailed = false;
      mocks.rows = [
        {
          datasetId: "dataset-districts",
          name: "Mozambique districts",
          canDelete: true,
        },
      ];
      const { rerenderModal } = _renderModal();
      _checkDataset("Mozambique districts");
      mocks.hasFailed = true;
      rerenderModal();

      fireEvent.click(
        screen.getByRole("button", { name: "Uninstall and keep all datasets" }),
      );

      await waitFor(() => {
        expect(mocks.uninstall).toHaveBeenCalledWith({
          installationId: "installation-1",
          datasetIds: [],
        });
      });
    });

    it("keeps the alert, a loading Retry and the keep-all confirm, disabled, while the retry runs", () => {
      mocks.isRetrying = true;
      mocks.hasFailed = false;
      mocks.isLoading = true;

      _renderModal();

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toHaveAttribute(
        "data-loading",
        "true",
      );
      expect(
        screen.getByRole("button", { name: "Uninstall and keep all datasets" }),
      ).toBeDisabled();
      expect(
        screen.queryByRole("status", { name: "Loading datasets" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Loading the datasets this plugin imported.",
      );
    });

    it("moves focus to the status when Retry is pressed, since the button is replaced", () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(screen.getByRole("status")).toHaveFocus();
    });

    it("shows the list again and announces it once the retry succeeds", () => {
      const { rerenderModal } = _renderModal();
      mocks.hasFailed = false;
      mocks.isRetrying = true;
      mocks.isLoading = true;
      rerenderModal();

      mocks.isRetrying = false;
      mocks.isLoading = false;
      mocks.rows = [
        {
          datasetId: "dataset-districts",
          name: "Mozambique districts",
          canDelete: true,
        },
      ];
      rerenderModal();

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", { name: "Delete Mozambique districts" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Uninstall" })).toBeEnabled();
      expect(screen.getByRole("status")).toHaveTextContent(
        "The datasets this plugin imported are loaded.",
      );
    });
  });

  describe("when the uninstall fails and the modal stays open", () => {
    beforeEach(() => {
      mocks.uninstall.mockRejectedValue(new Error("rpc failed"));
    });

    it("returns focus to the confirm button, which was disabled while running", async () => {
      _renderModal();

      fireEvent.click(screen.getByRole("button", { name: "Uninstall" }));

      await waitFor(() => {
        expect(mocks.notifyError).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Uninstall" })).toHaveFocus();
      });
      expect(mocks.onClose).not.toHaveBeenCalled();
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
      finish({
        deletedDatasetIds: [],
        refusedDatasetIds: [],
        incompleteDatasetIds: [],
        unreadDatasetIds: [],
      });
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
});
