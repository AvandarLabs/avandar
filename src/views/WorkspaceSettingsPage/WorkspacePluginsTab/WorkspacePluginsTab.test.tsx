import { ModalsProvider } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@/test-utils";
import { WorkspacePluginsTab } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/WorkspacePluginsTab";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    entries: [] as unknown[],
    installations: [] as unknown[],
    getAllArguments: [] as unknown[],
    canManage: true,
    isLoadingInstallations: false,
    hasInstallationsError: false,
    hasInstallationsData: true,
    contentImports: [] as unknown[],
    isLoadingContentImports: false,
    isFetchingContentImports: false,
    hasContentImportsError: false,
    refetchContentImports: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "workspace-slug" };
    },
  };
});
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.canManage;
    },
  };
});
vi.mock(
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    const useMutationStub = () => {
      return [vi.fn(), false];
    };
    return {
      PluginInstallationClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginInstallationClient", "getAll"];
          },
        },
        useGetAll: (argument: unknown) => {
          mocks.getAllArguments.push(argument);
          return [
            mocks.hasInstallationsData ? mocks.installations : undefined,
            mocks.isLoadingInstallations,
            { isError: mocks.hasInstallationsError },
          ];
        },
        useInstall: useMutationStub,
        useUpdate: useMutationStub,
        useDelete: useMutationStub,
      },
    };
  },
);
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getBundledPluginEntries: () => {
      return mocks.entries;
    },
    getPluginIndexEntry: (pluginId: string) => {
      return (mocks.entries as PluginIndexEntry[]).find((entry) => {
        return entry.id === pluginId;
      });
    },
  };
});
// The install wizard lists the workspace's case types and datasets, and
// imports content. These stubs keep the dataset clients' DuckDB and storage
// modules out of the test.
vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      QueryKeys: {
        getAll: () => {
          return ["DatasetClient", "getAll"];
        },
      },
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});
vi.mock(
  "@/lib/pluginDataSlots/checkDataSlotBinding/checkDataSlotBinding",
  () => {
    return { checkDataSlotBinding: vi.fn() };
  },
);
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/importPluginContentItem/importPluginContentItem",
  () => {
    return { importPluginContentItem: vi.fn() };
  },
);
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
          return [
            mocks.contentImports,
            mocks.isLoadingContentImports,
            {
              isFetching: mocks.isFetchingContentImports,
              isError: mocks.hasContentImportsError,
              refetch: mocks.refetchContentImports,
            },
          ];
        },
      },
    };
  },
);
vi.mock(
  "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient",
  () => {
    return {
      PluginDataSlotBindingClient: {
        QueryKeys: {
          getAll: () => {
            return ["PluginDataSlotBindingClient", "getAll"];
          },
        },
        useGetAll: () => {
          return [[], false, {}];
        },
        useDelete: () => {
          return [vi.fn(), false, {}];
        },
      },
    };
  },
);
vi.mock("@/lib/pluginDataSlots/loadDataSlotSource/loadDataSlotSource", () => {
  return { loadDataSlotSource: vi.fn() };
});
vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-id" };
    },
  };
});
vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/uninstallPluginAndDeleteDatasets/uninstallPluginAndDeleteDatasets",
  () => {
    return {
      uninstallPluginAndDeleteDatasets: vi.fn(() => {
        return Promise.resolve({
          deletedDatasetIds: [],
          refusedDatasetIds: [],
          incompleteDatasetIds: [],
        });
      }),
    };
  },
);
vi.mock("@/utils/notifications/notify", () => {
  return {
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
    notifyError: vi.fn(),
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const PLUGIN_ID = "avandar.epidemiology";
const REMOVED_PLUGIN_ID = "avandar.removed";

let queryClient: QueryClient;
let nextEntryNumber = 0;

function _makeManifestModule(
  pluginId: string,
  icons: Record<string, unknown>,
  manifestOverrides: Record<string, unknown> = {},
): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
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
        "content.cases.title": "Sample cases",
      },
    },
    icons,
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  options: {
    icons?: Record<string, unknown>;
    manifestOverrides?: Record<string, unknown>;
  } = {},
): void {
  nextEntryNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `${PLUGIN_ID}-${nextEntryNumber}`;
  mocks.entries.push({
    id,
    loadManifest: () => {
      return Promise.resolve(
        _makeManifestModule(id, options.icons ?? {}, options.manifestOverrides),
      );
    },
  });
}

function _addInstallation(overrides: Partial<PluginInstallation.T>): void {
  mocks.installations.push({
    id: "installation-id",
    pluginId: PLUGIN_ID,
    isEnabled: true,
    grantedPermissions: ["data:context"],
    installedVersion: "1.2.0",
    ...overrides,
  });
}

// The modals provider sits inside the query client, as in the app, so a
// modal a card opens can read queries too.
function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
        {children}
      </ModalsProvider>
    </QueryClientProvider>
  );
}

function _renderTab(): ReturnType<typeof render> {
  return render(<WorkspacePluginsTab />, { wrapper: QueryWrapper });
}

function _getButtonLabelsIn(card: HTMLElement): string[] {
  return within(card)
    .getAllByRole("button")
    .map((button) => {
      return button.textContent ?? "";
    });
}

describe("WorkspacePluginsTab", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.entries = [];
    mocks.installations = [];
    mocks.getAllArguments = [];
    mocks.canManage = true;
    mocks.isLoadingInstallations = false;
    mocks.hasInstallationsError = false;
    mocks.hasInstallationsData = true;
    mocks.contentImports = [];
    mocks.isLoadingContentImports = false;
    mocks.isFetchingContentImports = false;
    mocks.hasContentImportsError = false;
    mocks.refetchContentImports.mockReset();
  });

  it("offers Install for a bundled plugin the workspace lacks", async () => {
    _addBundledPlugin();

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      within(card).getByText("Charts disease spread."),
    ).toBeInTheDocument();
    expect(within(card).getByText("Not installed")).toBeInTheDocument();
    expect(_getButtonLabelsIn(card)).toEqual(["See more", "Install"]);
  });

  it("offers Disable and Uninstall for an installed plugin", async () => {
    _addBundledPlugin();
    _addInstallation({ pluginId: (mocks.entries[0] as PluginIndexEntry).id });

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(within(card).getByText("Installed")).toBeInTheDocument();
    expect(_getButtonLabelsIn(card)).toEqual([
      "See more",
      "Disable",
      "Uninstall",
    ]);
  });

  it("starts a bundled plugin's card collapsed, hiding what it adds", async () => {
    _addBundledPlugin();

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      within(card).getByRole("button", { name: "See more" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(card).queryByRole("heading", { name: "What it adds" }),
    ).not.toBeInTheDocument();
  });

  it("lists a toolbar command by the title in the plugin's own strings once expanded", async () => {
    _addBundledPlugin();

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    fireEvent.click(within(card).getByRole("button", { name: "See more" }));
    expect(
      await within(card).findByText("Data Explorer toolbar: Linear regression"),
    ).toBeInTheDocument();
  });

  it("offers only Uninstall for an install whose plugin is no longer bundled", async () => {
    _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

    _renderTab();

    const card = await screen.findByRole("region", { name: REMOVED_PLUGIN_ID });
    expect(within(card).getByText("Unavailable")).toBeInTheDocument();
    expect(_getButtonLabelsIn(card)).toEqual(["Uninstall"]);
  });

  it("opens the uninstall modal, not a confirm, for an unavailable plugin that imported datasets", async () => {
    _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
    mocks.contentImports = [
      { contentId: "cases", pluginId: REMOVED_PLUGIN_ID, datasetId: "gone" },
    ];

    _renderTab();

    const card = await screen.findByRole("region", { name: REMOVED_PLUGIN_ID });
    await waitFor(() => {
      expect(
        within(card).getByRole("button", { name: "Uninstall" }),
      ).toBeEnabled();
    });
    fireEvent.click(within(card).getByRole("button", { name: "Uninstall" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(`Uninstall ${REMOVED_PLUGIN_ID}?`);
    expect(dialog).toHaveTextContent("Datasets it imported");
    expect(dialog).toHaveTextContent("1 more dataset you can't see stays.");
  });

  it.each([
    ["while the imports load", { isLoadingContentImports: true }],
    ["while the imports refetch", { isFetchingContentImports: true }],
    [
      "while the imports refetch after a failure",
      { isFetchingContentImports: true, hasContentImportsError: true },
    ],
  ] as const)(
    "keeps Uninstall disabled and opens no confirm %s",
    async (_label, state) => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
      Object.assign(mocks, state);

      _renderTab();

      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });
      const button = within(card).getByRole("button", { name: "Uninstall" });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  describe("when the imports fail to load", () => {
    const LOOKUP_ERROR =
      "We could not check whether this plugin imported datasets.";

    beforeEach(() => {
      mocks.hasContentImportsError = true;
    });

    it("says the lookup failed, in an alert on the card", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

      _renderTab();

      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });
      expect(within(card).getByRole("alert")).toHaveTextContent(LOOKUP_ERROR);
    });

    it("asks for the imports again when Retry is pressed", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
      _renderTab();
      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });

      fireEvent.click(within(card).getByRole("button", { name: "Retry" }));

      expect(mocks.refetchContentImports).toHaveBeenCalledTimes(1);
    });

    it("keeps Uninstall enabled", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

      _renderTab();

      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });
      expect(
        within(card).getByRole("button", { name: "Uninstall" }),
      ).toBeEnabled();
    });

    it("confirms an uninstall that keeps every dataset, never opening the dataset modal", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
      // A restored cache may still list imports after a failed refetch.
      mocks.contentImports = [
        { contentId: "cases", pluginId: REMOVED_PLUGIN_ID, datasetId: "d1" },
      ];
      _renderTab();
      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });

      fireEvent.click(within(card).getByRole("button", { name: "Uninstall" }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent(`Uninstall ${REMOVED_PLUGIN_ID}?`);
      expect(dialog).toHaveTextContent(
        "We could not check for datasets this plugin imported.",
      );
      expect(dialog).toHaveTextContent(
        "If you uninstall it now, every dataset it imported is kept.",
      );
      expect(dialog).not.toHaveTextContent("Datasets it imported");
    });

    it("shows no alert to a user who cannot manage plugins", async () => {
      mocks.canManage = false;
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

      _renderTab();

      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });
      expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows no alert on a plugin that is not installed", async () => {
      _addBundledPlugin();

      _renderTab();

      const card = await screen.findByRole("region", { name: "Epidemiology" });
      expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
    });

    it("ties Retry to the plugin it belongs to", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

      _renderTab();

      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });
      expect(
        within(card).getByRole("button", { name: "Retry" }),
      ).toHaveAccessibleDescription(REMOVED_PLUGIN_ID);
    });

    it("keeps the alert, Retry loading and Uninstall disabled while the retry runs", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
      const { rerender } = _renderTab();
      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });

      // A query with no data drops its error as soon as the retry starts.
      mocks.hasContentImportsError = false;
      mocks.isFetchingContentImports = true;
      rerender(<WorkspacePluginsTab />);

      expect(within(card).getByRole("alert")).toHaveTextContent(LOOKUP_ERROR);
      expect(
        within(card).getByRole("button", { name: "Retry" }),
      ).toHaveAttribute("data-loading", "true");
      expect(within(card).getByRole("status")).toHaveTextContent(
        "Checking for datasets this plugin imported.",
      );
      expect(
        within(card).getByRole("button", { name: "Uninstall" }),
      ).toBeDisabled();
    });

    it("moves focus to the status when Retry is pressed", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
      _renderTab();
      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });

      fireEvent.click(within(card).getByRole("button", { name: "Retry" }));

      expect(within(card).getByRole("status")).toHaveFocus();
    });

    it("drops the alert and announces the recovery once the retry succeeds", async () => {
      _addInstallation({ pluginId: REMOVED_PLUGIN_ID });
      const { rerender } = _renderTab();
      const card = await screen.findByRole("region", {
        name: REMOVED_PLUGIN_ID,
      });
      mocks.hasContentImportsError = false;
      mocks.isFetchingContentImports = true;
      rerender(<WorkspacePluginsTab />);

      mocks.isFetchingContentImports = false;
      rerender(<WorkspacePluginsTab />);

      expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
      expect(within(card).getByRole("status")).toHaveTextContent(
        "We checked for datasets this plugin imported.",
      );
      expect(
        within(card).getByRole("button", { name: "Uninstall" }),
      ).toBeEnabled();
    });
  });

  it("enables Uninstall once the imports lookup is settled", async () => {
    _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

    _renderTab();

    const card = await screen.findByRole("region", { name: REMOVED_PLUGIN_ID });
    expect(within(card).getByRole("button", { name: "Uninstall" })).toBeEnabled();
  });

  describe("the uninstall modal of a plugin that imported datasets", () => {
    async function _openUninstallModal(): Promise<HTMLElement> {
      _addBundledPlugin();
      _addInstallation({ pluginId: (mocks.entries[0] as PluginIndexEntry).id });
      mocks.contentImports = [
        { contentId: "cases", pluginId: "any", datasetId: "gone" },
      ];
      _renderTab();
      const card = await screen.findByRole("region", { name: "Epidemiology" });
      const uninstallButton = within(card).getByRole("button", {
        name: "Uninstall",
      });
      uninstallButton.focus();
      fireEvent.click(uninstallButton);
      await screen.findByRole("dialog");
      return uninstallButton;
    }

    it("returns focus to the Uninstall button on Cancel", async () => {
      const uninstallButton = await _openUninstallModal();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => {
        expect(uninstallButton).toHaveFocus();
      });
    });

    it("moves focus to the card heading after the plugin is uninstalled", async () => {
      const uninstallButton = await _openUninstallModal();

      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Uninstall",
        }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Epidemiology" }),
        ).toHaveFocus();
      });
      expect(uninstallButton).not.toHaveFocus();
    });
  });

  it("says so when this deployment bundles no plugins", async () => {
    _renderTab();

    expect(
      await screen.findByText("No plugins are available in this deployment."),
    ).toBeInTheDocument();
  });

  it("opens the install wizard, titled with the plugin's name, from Install", async () => {
    _addBundledPlugin();
    _renderTab();
    const card = await screen.findByRole("region", { name: "Epidemiology" });

    fireEvent.click(within(card).getByRole("button", { name: "Install" }));

    const wizard = await screen.findByRole("dialog", {
      name: "Install Epidemiology",
    });
    expect(
      within(wizard).getByRole("heading", { name: "About this plugin" }),
    ).toBeInTheDocument();
  });

  it("returns focus to the Install button when the wizard is closed without installing", async () => {
    _addBundledPlugin();
    _renderTab();
    const card = await screen.findByRole("region", { name: "Epidemiology" });
    const installButton = within(card).getByRole("button", { name: "Install" });
    installButton.focus();
    fireEvent.click(installButton);
    await screen.findByRole("dialog", { name: "Install Epidemiology" });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(installButton).toHaveFocus();
    });
  });

  it.each(["Close button", "Escape"])(
    "moves focus to the card heading when the wizard closes with %s after the Install button is gone",
    async (closeWith) => {
      _addBundledPlugin();
      const view = _renderTab();
      const card = await screen.findByRole("region", { name: "Epidemiology" });
      const installButton = within(card).getByRole("button", {
        name: "Install",
      });
      installButton.focus();
      fireEvent.click(installButton);
      await screen.findByRole("dialog", { name: "Install Epidemiology" });
      // The install lands: the card's Install button is replaced.
      _addInstallation({
        pluginId: (mocks.entries.at(-1) as PluginIndexEntry).id,
      });
      view.rerender(<WorkspacePluginsTab />);
      await waitFor(() => {
        expect(installButton).not.toBeInTheDocument();
      });

      if (closeWith === "Escape") {
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
      }

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Epidemiology" }),
        ).toHaveFocus();
      });
    },
  );

  describe("an installed plugin with data slots and content", () => {
    const MANIFEST_OVERRIDES = {
      permissions: ["data:slots"],
      dataSlots: {
        cases: {
          title: "%slot.cases.title%",
          required: false,
          attributes: {
            onsetDate: { type: "date", title: "%onset%", required: true },
          },
        },
      },
      contributes: {
        commands: [],
        menus: {},
        vizTypes: [],
        aiTools: [],
        content: [
          {
            id: "cases",
            kind: "dataset",
            title: "%content.cases.title%",
            description: "%content.cases.title%",
            file: "content/cases.csv",
          },
        ],
      },
    };

    it("lists the records it reads and the datasets it includes once installed", async () => {
      _addBundledPlugin({ manifestOverrides: MANIFEST_OVERRIDES });
      _addInstallation({
        pluginId: (mocks.entries[0] as PluginIndexEntry).id,
        grantedPermissions: ["data:slots"],
      });

      _renderTab();

      const card = await screen.findByRole("region", { name: "Epidemiology" });
      expect(
        within(card).getByRole("heading", { name: "Records it reads" }),
      ).toBeInTheDocument();
      expect(
        within(card).getByRole("heading", { name: "Datasets it includes" }),
      ).toBeInTheDocument();
    });

    it("leaves both out before the plugin is installed", async () => {
      _addBundledPlugin({ manifestOverrides: MANIFEST_OVERRIDES });

      _renderTab();

      const card = await screen.findByRole("region", { name: "Epidemiology" });
      expect(
        within(card).queryByRole("heading", { name: "Records it reads" }),
      ).not.toBeInTheDocument();
      expect(
        within(card).queryByRole("heading", { name: "Datasets it includes" }),
      ).not.toBeInTheDocument();
    });
  });

  it("disables the actions for users who cannot manage plugins", async () => {
    mocks.canManage = false;
    _addBundledPlugin();

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      within(card).getByRole("button", { name: "Install" }),
    ).toBeDisabled();
  });

  it("still lists the plugins that loaded when another fails to load", async () => {
    _addBundledPlugin();
    mocks.entries.push({
      id: "avandar.broken",
      loadManifest: () => {
        return Promise.reject(new Error("chunk failed"));
      },
    });

    _renderTab();

    expect(
      await screen.findByRole("region", { name: "Epidemiology" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Some plugins could not be loaded/),
    ).toBeInTheDocument();
  });

  it("names each card by its heading", async () => {
    _addBundledPlugin();

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      within(card).getByRole("heading", { level: 5, name: "Epidemiology" }),
    ).toBeInTheDocument();
  });

  it("describes every action by its plugin, so a screen reader hears which plugin Install applies to", async () => {
    _addBundledPlugin();
    _addInstallation({ pluginId: (mocks.entries[0] as PluginIndexEntry).id });

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    within(card)
      .getAllByRole("button")
      .forEach((button) => {
        expect(button).toHaveAccessibleDescription("Epidemiology");
      });
  });

  it("announces that plugins are loading", () => {
    mocks.isLoadingInstallations = true;

    _renderTab();

    expect(
      screen.getByRole("status", { name: "Loading plugins" }),
    ).toBeInTheDocument();
  });

  it("shows an error and no plugin cards when the workspace's installs fail to load", async () => {
    _addBundledPlugin();
    mocks.hasInstallationsError = true;
    mocks.hasInstallationsData = false;

    _renderTab();

    expect(
      await screen.findByText(/Could not load this workspace's plugins/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Install" }),
    ).not.toBeInTheDocument();
  });

  it("keeps showing the cached plugin cards when a background refetch of the installs fails", async () => {
    _addBundledPlugin();
    _addInstallation({ pluginId: (mocks.entries[0] as PluginIndexEntry).id });
    mocks.hasInstallationsError = true;

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(within(card).getByText("Installed")).toBeInTheDocument();
    expect(
      screen.queryByText(/Could not load this workspace's plugins/),
    ).not.toBeInTheDocument();
  });

  it("explains on an unavailable card why only Uninstall is offered", async () => {
    _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

    _renderTab();

    const card = await screen.findByRole("region", { name: REMOVED_PLUGIN_ID });
    expect(
      within(card).getByText(
        "No longer included in this deployment. Uninstall to remove it from this workspace.",
      ),
    ).toBeInTheDocument();
  });

  it("does not call a bundled plugin unavailable", async () => {
    _addBundledPlugin();

    _renderTab();

    await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      screen.queryByText(/No longer included in this deployment/),
    ).not.toBeInTheDocument();
  });

  it("tells users who cannot manage plugins why the actions are disabled", async () => {
    mocks.canManage = false;
    _addBundledPlugin();

    _renderTab();

    await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      screen.getByText(
        "You do not have permission to manage plugins. Ask a workspace admin to make changes.",
      ),
    ).toBeInTheDocument();
  });

  it("shows no permission note to users who can manage plugins", async () => {
    _addBundledPlugin();

    _renderTab();

    await screen.findByRole("region", { name: "Epidemiology" });
    expect(
      screen.queryByText(/You do not have permission to manage plugins/),
    ).not.toBeInTheDocument();
  });

  it("still renders a card whose manifest icon is not a component", async () => {
    // JSON persistence turns a component into `{}`, which React cannot render.
    _addBundledPlugin({ icons: { "chart-dots": {} } });

    _renderTab();

    expect(
      await screen.findByRole("region", { name: "Epidemiology" }),
    ).toBeInTheDocument();
  });

  it("keeps the bundled manifests out of the persisted query cache", async () => {
    _addBundledPlugin();

    _renderTab();
    await screen.findByRole("region", { name: "Epidemiology" });

    const queries = queryClient.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0]?.meta).toEqual({ persist: false });
  });

  it("refetches the installs of this workspace every time the tab mounts", async () => {
    _addBundledPlugin();

    _renderTab();
    await screen.findByRole("region", { name: "Epidemiology" });

    expect(mocks.getAllArguments[0]).toEqual({
      where: { workspace_id: { eq: "workspace-id" } },
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  });
});
