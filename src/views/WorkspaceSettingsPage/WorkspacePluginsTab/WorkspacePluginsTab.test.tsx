import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@/test-utils";
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
    canManage: true,
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
        useGetAll: () => {
          return [mocks.installations, false];
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

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      name: "%name%",
      description: "%description%",
      version: "1.2.0",
      icon: "chart-dots",
      permissions: ["data:context"],
      contributes: {
        commands: [{ id: "run", title: "%name%", icon: "chart-dots" }],
        menus: { "dataExplorer.toolbar": [{ command: "run" }] },
      },
    },
    strings: {
      en: { name: "Epidemiology", description: "Charts disease spread." },
    },
    icons: {},
  } as unknown as PluginManifestModule;
}

function _addBundledPlugin(): void {
  nextEntryNumber += 1;
  // A new id each test, because the plugin module cache lives for the session.
  const id = `${PLUGIN_ID}-${nextEntryNumber}`;
  mocks.entries.push({
    id,
    loadManifest: () => {
      return Promise.resolve(_makeManifestModule(id));
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
    mocks.canManage = true;
  });

  it("offers Install for a bundled plugin the workspace lacks", async () => {
    _addBundledPlugin();

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(within(card).getByText("Charts disease spread.")).toBeTruthy();
    expect(within(card).getByText("Not installed")).toBeTruthy();
    expect(_getButtonLabelsIn(card)).toEqual(["Install"]);
  });

  it("offers Disable and Uninstall for an installed plugin", async () => {
    _addBundledPlugin();
    _addInstallation({ pluginId: (mocks.entries[0] as PluginIndexEntry).id });

    _renderTab();

    const card = await screen.findByRole("region", { name: "Epidemiology" });
    expect(within(card).getByText("Installed")).toBeTruthy();
    expect(_getButtonLabelsIn(card)).toEqual(["Disable", "Uninstall"]);
  });

  it("offers only Uninstall for an install whose plugin is no longer bundled", async () => {
    _addInstallation({ pluginId: REMOVED_PLUGIN_ID });

    _renderTab();

    const card = await screen.findByRole("region", { name: REMOVED_PLUGIN_ID });
    expect(within(card).getByText("Unavailable")).toBeTruthy();
    expect(_getButtonLabelsIn(card)).toEqual(["Uninstall"]);
  });

  it("says so when this deployment bundles no plugins", async () => {
    _renderTab();

    expect(
      await screen.findByText("No plugins are available in this deployment."),
    ).toBeTruthy();
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
    ).toBeTruthy();
    expect(screen.getByText(/Some plugins could not be loaded/)).toBeTruthy();
  });
});
