import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

type InstallOptions = {
  onSuccess: (installation: unknown) => void;
  onError: (error: Error) => void;
};

const mocks = vi.hoisted(() => {
  return {
    install: vi.fn(),
    installOptions: undefined as InstallOptions | undefined,
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    contentImports: [] as unknown[],
    importPluginContentItem: vi.fn(),
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
vi.mock(
  "@/clients/plugins/PluginContentImportClient/PluginContentImportClient",
  () => {
    return {
      PluginContentImportClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginContentImportClient", "getAll"];
          },
        },
        useGetAll: () => {
          return [mocks.contentImports, false, {}];
        },
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
  () => {
    return { importPluginContentItem: mocks.importPluginContentItem };
  },
);
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: () => {
      return {
        loadContentUrls: () => {
          return Promise.resolve({
            provinces: "/assets/mz-adm1.csv",
            districts: "/assets/mz-adm2.csv",
          });
        },
      };
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginInstallationClient", "getAll"];
          },
        },
        useInstall: (options: InstallOptions) => {
          mocks.installOptions = options;
          return [mocks.install, false, {}];
        },
      },
    };
  },
);
// The panel has its own tests. This stand-in binds its slot in one click.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel",
  () => {
    return {
      DataSlotPanel: (props: {
        slotId: string;
        slotTitle: string;
        onDraftChange: (draft: PluginDataSlotBinding.Draft) => void;
      }) => {
        return (
          <button
            type="button"
            onClick={() => {
              props.onDraftChange(_makeDraft(props.slotId));
            }}
          >
            {`Bind ${props.slotTitle}`}
          </button>
        );
      },
    };
  },
);
// A draft counts as complete as soon as there is one.
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus",
  () => {
    return {
      useDataSlotDraftStatus: (options: { draft: unknown }) => {
        return {
          source: undefined,
          isLoadingSource: false,
          status:
            options.draft === undefined
              ? undefined
              : { kind: "bound", fieldsByAttributeKey: {} },
        };
      },
    };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotSourceOptions",
  () => {
    return {
      useDataSlotSourceOptions: () => {
        return {
          concepts: [{ id: "concept-deaths", name: "Measles deaths" }],
          datasets: [],
          isLoading: false,
        };
      },
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: mocks.notifySuccess,
    notifyError: mocks.notifyError,
  };
});

const INSTALLATION = {
  id: "installation-id",
  pluginId: "avandar.epidemiology",
};

const DATA_SLOTS = {
  cases: {
    title: "%slot.cases.title%",
    description: "%slot.cases.description%",
    required: false,
    attributes: {
      onsetDate: { type: "date", title: "%onset%", required: true },
    },
  },
  deaths: {
    title: "%slot.deaths.title%",
    required: true,
    attributes: {
      deathDate: { type: "date", title: "%death%", required: true },
    },
  },
};

const CONTENT = [
  {
    id: "provinces",
    kind: "dataset",
    title: "%content.provinces.title%",
    description: "%content.provinces.description%",
    file: "content/mz-adm1.csv",
  },
  {
    id: "districts",
    kind: "dataset",
    title: "%content.districts.title%",
    description: "%content.districts.description%",
    file: "content/mz-adm2.csv",
  },
];

let queryClient: QueryClient;

function _makeDraft(slotId: string): PluginDataSlotBinding.Draft {
  return {
    slotId,
    sourceType: "concept",
    conceptId: `concept-${slotId}` as PluginDataSlotBinding.Draft["conceptId"],
    datasetId: undefined,
    attributeMap: { date: `attribute-${slotId}` },
  };
}
let onClose: ReturnType<typeof vi.fn>;

function _makeManifestModule(
  manifestOverrides: Record<string, unknown> = {},
): PluginManifestModule {
  return {
    manifest: {
      id: "avandar.epidemiology",
      name: "%name%",
      description: "%description%",
      version: "1.2.0",
      license: "MIT",
      icon: "chart-dots",
      permissions: ["data:context"],
      dataSlots: {},
      contributes: {
        commands: [{ id: "run", title: "%run.title%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
        vizTypes: [],
        aiTools: [],
        content: [],
      },
      ...manifestOverrides,
    },
    strings: {
      en: {
        name: "Epidemiology",
        description: "Charts disease spread.",
        "run.title": "Linear regression",
        "slot.cases.title": "Cases",
        "slot.cases.description": "The case records the epicurve counts.",
        "slot.deaths.title": "Deaths",
        "content.provinces.title": "Mozambique provinces",
        "content.provinces.description": "Province boundaries.",
        "content.districts.title": "Mozambique districts",
        "content.districts.description": "District boundaries.",
      },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderWizard(manifestModule = _makeManifestModule()): void {
  render(
    <PluginInstallWizard
      pluginName="Epidemiology"
      manifestModule={manifestModule}
      onClose={onClose}
    />,
    { wrapper: QueryWrapper },
  );
}

function _clickButton(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function _succeedInstall(): void {
  mocks.install.mockImplementation(() => {
    mocks.installOptions?.onSuccess(INSTALLATION);
  });
}

describe("PluginInstallWizard", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.install.mockReset();
    mocks.importPluginContentItem.mockReset();
    mocks.contentImports = [];
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    onClose = vi.fn();
  });

  it("opens on Review with the plugin's version, license, and additions", () => {
    _renderWizard();

    expect(
      screen.getByRole("heading", { name: "About this plugin" }),
    ).toHaveFocus();
    expect(
      screen.getByText("avandar · version 1.2.0 · MIT license"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Data Explorer toolbar: Linear regression"),
    ).toBeInTheDocument();
  });

  it("marks only Review and Confirm in the stepper for a plugin with no data slots or content", () => {
    _renderWizard();

    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.queryByText("Records")).not.toBeInTheDocument();
    expect(screen.queryByText("Datasets")).not.toBeInTheDocument();
  });

  it("moves focus to the Summary heading when Next is pressed on Review", () => {
    _renderWizard();

    _clickButton("Next");

    expect(screen.getByRole("heading", { name: "Summary" })).toHaveFocus();
  });

  it("moves focus back to the Review heading when Back is pressed", () => {
    _renderWizard();
    _clickButton("Next");

    _clickButton("Back");

    expect(
      screen.getByRole("heading", { name: "About this plugin" }),
    ).toHaveFocus();
  });

  it("offers no Back on the first page", () => {
    _renderWizard();

    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("installs with the manifest's version, every permission, and no bindings", () => {
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.install).toHaveBeenCalledWith({
      workspaceId: "workspace-id",
      pluginId: "avandar.epidemiology",
      installedVersion: "1.2.0",
      grantedPermissions: ["data:context"],
      bindings: [],
    });
  });

  it("refreshes every plugin installs query once installed", () => {
    _renderWizard();

    expect(mocks.installOptions).toMatchObject({
      queriesToInvalidate: [["PluginInstallationClient", "getAll"]],
    });
  });

  it("shows the installed notification and status once the install succeeds", () => {
    _succeedInstall();
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.notifySuccess).toHaveBeenCalledWith("Epidemiology installed");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Epidemiology is installed.",
    );
  });

  it("swaps Install and Back for Done once installed, and Done closes the wizard", () => {
    _succeedInstall();
    _renderWizard();
    _clickButton("Next");
    _clickButton("Install");

    expect(
      screen.queryByRole("button", { name: "Install" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
    _clickButton("Done");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Install available and reports the error when the install fails", () => {
    mocks.install.mockImplementation(() => {
      mocks.installOptions?.onError(new Error("permission denied"));
    });
    _renderWizard();
    _clickButton("Next");

    _clickButton("Install");

    expect(mocks.notifyError).toHaveBeenCalledWith({
      title: "Could not install Epidemiology",
      message: "permission denied",
    });
    expect(screen.getByRole("button", { name: "Install" })).toBeEnabled();
  });

  describe("data slots", () => {
    function _renderWizardWithDataSlots(): void {
      _renderWizard(
        _makeManifestModule({
          permissions: ["data:slots"],
          dataSlots: DATA_SLOTS,
        }),
      );
    }

    it("gives each data slot its own page, titled and described by the slot", () => {
      _renderWizardWithDataSlots();

      _clickButton("Next");

      expect(screen.getByRole("heading", { name: "Cases" })).toHaveFocus();
      expect(
        screen.getByText("The case records the epicurve counts."),
      ).toBeInTheDocument();
      expect(screen.getByText("Records")).toBeInTheDocument();
    });

    it("offers Skip for now on an optional data slot and keeps Next off until it is bound", () => {
      _renderWizardWithDataSlots();
      _clickButton("Next");

      expect(
        screen.getByRole("button", { name: "Skip for now" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      _clickButton("Bind Cases");

      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    });

    it("blocks Next on a required data slot until it is bound, with no Skip", () => {
      _renderWizardWithDataSlots();
      _clickButton("Next");
      _clickButton("Skip for now");

      expect(screen.getByRole("heading", { name: "Deaths" })).toHaveFocus();
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      expect(
        screen.queryByRole("button", { name: "Skip for now" }),
      ).not.toBeInTheDocument();
      _clickButton("Bind Deaths");

      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    });

    it("installs with the bindings chosen and none for a skipped slot", () => {
      _renderWizardWithDataSlots();
      _clickButton("Next");
      _clickButton("Bind Cases");
      _clickButton("Skip for now");
      _clickButton("Bind Deaths");
      _clickButton("Next");

      _clickButton("Install");

      expect(mocks.install).toHaveBeenCalledWith(
        expect.objectContaining({
          grantedPermissions: ["data:slots"],
          bindings: [_makeDraft("deaths")],
        }),
      );
    });

    it("lists the records each data slot reads on the Confirm step", () => {
      _renderWizardWithDataSlots();
      _clickButton("Next");
      _clickButton("Skip for now");
      _clickButton("Bind Deaths");

      _clickButton("Next");

      expect(screen.getByText("Cases: not chosen yet")).toBeInTheDocument();
      expect(
        screen.getByText("Deaths: Case type: Measles deaths"),
      ).toBeInTheDocument();
    });
  });

  describe("content", () => {
    function _renderWizardWithContent(): void {
      _renderWizard(
        _makeManifestModule({
          permissions: [],
          contributes: {
            commands: [],
            menus: {},
            vizTypes: [],
            aiTools: [],
            content: CONTENT,
          },
        }),
      );
    }

    function _installFromContentStep(): void {
      _succeedInstall();
      _clickButton("Next");
      _clickButton("Install");
    }

    it("lists every bundled dataset on the Content step, each checked to start with", () => {
      _renderWizardWithContent();

      _clickButton("Next");

      expect(
        screen.getByRole("heading", { name: "Datasets to import" }),
      ).toHaveFocus();
      expect(
        screen.getByRole("checkbox", { name: "Mozambique provinces" }),
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "Mozambique districts" }),
      ).toBeChecked();
    });

    it("disables a dataset the workspace already imported and says so", () => {
      mocks.contentImports = [{ contentId: "provinces", datasetId: "d-1" }];
      _renderWizardWithContent();

      _clickButton("Next");

      expect(
        screen.getByRole("checkbox", { name: "Mozambique provinces" }),
      ).toBeDisabled();
      expect(screen.getByText("Already in this workspace")).toBeInTheDocument();
    });

    it("imports only chosen datasets the workspace lacks, once installed", async () => {
      mocks.contentImports = [{ contentId: "provinces", datasetId: "d-1" }];
      mocks.importPluginContentItem.mockResolvedValue("d-2");
      _renderWizardWithContent();
      _clickButton("Next");

      _installFromContentStep();

      expect(await screen.findByText("Imported")).toBeInTheDocument();
      expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(1);
      expect(mocks.importPluginContentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          item: CONTENT[1],
          datasetName: "Mozambique districts",
          url: "/assets/mz-adm2.csv",
        }),
      );
    });

    it("imports nothing when every dataset is unchecked", () => {
      _renderWizardWithContent();
      _clickButton("Next");
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Mozambique provinces" }),
      );
      fireEvent.click(
        screen.getByRole("checkbox", { name: "Mozambique districts" }),
      );

      _installFromContentStep();

      expect(screen.getByText("None")).toBeInTheDocument();
      expect(mocks.importPluginContentItem).not.toHaveBeenCalled();
    });

    it("shows why a dataset failed and imports it again with Retry", async () => {
      mocks.importPluginContentItem
        .mockRejectedValueOnce(new Error("permission denied"))
        .mockResolvedValue("d-2");
      _renderWizardWithContent();
      _clickButton("Next");
      _installFromContentStep();
      expect(
        await screen.findByText("Failed: permission denied"),
      ).toBeInTheDocument();

      _clickButton("Retry Mozambique provinces");

      await waitFor(() => {
        expect(screen.getAllByText("Imported")).toHaveLength(2);
      });
      expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(3);
    });

    it("keeps Done disabled until the imports finish", async () => {
      let finishImport: (datasetId: string) => void = () => {};
      mocks.importPluginContentItem.mockImplementation(() => {
        return new Promise((resolve) => {
          finishImport = resolve;
        });
      });
      _renderWizardWithContent();
      _clickButton("Next");
      _installFromContentStep();
      await waitFor(() => {
        expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByRole("button", { name: "Done" })).toBeDisabled();

      finishImport("d-1");
      await waitFor(() => {
        expect(mocks.importPluginContentItem).toHaveBeenCalledTimes(2);
      });
      finishImport("d-2");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
      });
    });
  });
});
