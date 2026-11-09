import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { cleanup, fireEvent, render, screen, within } from "@/test-utils";
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
        useInsert: useMutationStub,
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
): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      name: "%name%",
      description: "%description%",
      version: "1.2.0",
      icon: "chart-dots",
      permissions: ["data:context"],
      contributes: {
        commands: [{ id: "run", title: "%run.title%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
        vizTypes: [],
      },
    },
    strings: {
      en: {
        name: "Epidemiology",
        description: "Charts disease spread.",
        "run.title": "Linear regression",
      },
    },
    icons,
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(
  options: { icons?: Record<string, unknown> } = {},
): void {
  nextEntryNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `${PLUGIN_ID}-${nextEntryNumber}`;
  mocks.entries.push({
    id,
    loadManifest: () => {
      return Promise.resolve(_makeManifestModule(id, options.icons ?? {}));
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

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderTab(): void {
  render(<WorkspacePluginsTab />, { wrapper: QueryWrapper });
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

  it("says so when this deployment bundles no plugins", async () => {
    _renderTab();

    expect(
      await screen.findByText("No plugins are available in this deployment."),
    ).toBeInTheDocument();
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
