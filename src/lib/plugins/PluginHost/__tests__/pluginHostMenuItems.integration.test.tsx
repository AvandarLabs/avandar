import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { PluginHost } from "@/lib/plugins/PluginHost/PluginHost";
import { usePluginMenuItems } from "@/lib/plugins/PluginHost/usePluginMenuItems";
import { cleanup, render, screen, waitFor } from "@/test-utils";
import type { PluginMenuItem } from "@/lib/plugins/getMenuItemsFromActivePlugins/getMenuItemsFromActivePlugins";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";
import type { SlotId, WhenFacts } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return {
    installations: [] as unknown[],
    getAllArguments: [] as unknown[],
    loadManifest: vi.fn(),
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
  "@/clients/plugins/PluginInstallationClient/PluginInstallationClient",
  () => {
    return {
      PluginInstallationClient: {
        useGetAll: (argument: unknown) => {
          mocks.getAllArguments.push(argument);
          return [mocks.installations];
        },
      },
    };
  },
);
vi.mock("@/lib/plugins/makePluginModuleCache/makePluginModuleCache", () => {
  return { PluginModuleCache: { loadManifest: mocks.loadManifest } };
});
vi.mock("@/lib/plugins/pluginIndexHelpers", () => {
  return {
    getPluginIndexEntry: (pluginId: string) => {
      return { id: pluginId } as PluginIndexEntry;
    },
  };
});
vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const SLOT_ID: SlotId = "dataExplorer.toolbar";
const FACTS: WhenFacts = {};
const FAILING_PLUGIN_ID = "avandar.failing";

let queryClient: QueryClient;
let lastItems: PluginMenuItem[] = [];

function _makeInstallation(pluginId: string): unknown {
  return { pluginId, isEnabled: true, grantedPermissions: [] };
}

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return {
    manifest: {
      id: pluginId,
      name: pluginId,
      permissions: [],
      contributes: {
        commands: [{ id: "run", title: `Run ${pluginId}`, icon: "none" }],
        menus: { [SLOT_ID]: [{ command: "run" }] },
      },
    },
    strings: {},
    icons: {},
  } as unknown as PluginManifestModule;
}

function _setInstalledPlugins(pluginIds: readonly string[]): void {
  mocks.installations = pluginIds.map(_makeInstallation);
}

function ItemTitles(): ReactNode {
  const items = usePluginMenuItems({ slotId: SLOT_ID, facts: FACTS });
  lastItems = items;
  return (
    <ul>
      {items.map((item) => {
        return <li key={item.key}>{item.title}</li>;
      })}
    </ul>
  );
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function _renderHost(): ReturnType<typeof render> {
  return render(
    <PluginHost>
      <ItemTitles />
    </PluginHost>,
    { wrapper: QueryWrapper },
  );
}

function _countManifestLoadsOf(pluginId: string): number {
  return mocks.loadManifest.mock.calls.filter(([entry]) => {
    return entry.id === pluginId;
  }).length;
}

describe("PluginHost with usePluginMenuItems", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    lastItems = [];
    mocks.getAllArguments = [];
    mocks.loadManifest.mockReset();
    mocks.loadManifest.mockImplementation((entry: PluginIndexEntry) => {
      return Promise.resolve(_makeManifestModule(entry.id));
    });
    _setInstalledPlugins([]);
  });

  it("lists the commands of plugins whose manifests loaded", async () => {
    _setInstalledPlugins(["avandar.alpha", "avandar.beta"]);

    _renderHost();

    expect(await screen.findByText("Run avandar.alpha")).toBeTruthy();
    expect(await screen.findByText("Run avandar.beta")).toBeTruthy();
  });

  it("lists the other plugins' commands when one manifest fails to load", async () => {
    mocks.loadManifest.mockImplementation((entry: PluginIndexEntry) => {
      return entry.id === FAILING_PLUGIN_ID
        ? Promise.reject(new Error("chunk failed"))
        : Promise.resolve(_makeManifestModule(entry.id));
    });
    _setInstalledPlugins(["avandar.alpha", FAILING_PLUGIN_ID]);

    _renderHost();

    expect(await screen.findByText("Run avandar.alpha")).toBeTruthy();
    expect(screen.queryByText(`Run ${FAILING_PLUGIN_ID}`)).toBeNull();
  });

  it("loads a failed manifest again when the host mounts again", async () => {
    mocks.loadManifest.mockImplementation((entry: PluginIndexEntry) => {
      return entry.id === FAILING_PLUGIN_ID
        ? Promise.reject(new Error("chunk failed"))
        : Promise.resolve(_makeManifestModule(entry.id));
    });
    _setInstalledPlugins(["avandar.alpha", FAILING_PLUGIN_ID]);
    const { unmount } = _renderHost();
    await screen.findByText("Run avandar.alpha");
    unmount();
    mocks.loadManifest.mockImplementation((entry: PluginIndexEntry) => {
      return Promise.resolve(_makeManifestModule(entry.id));
    });

    _renderHost();

    expect(await screen.findByText(`Run ${FAILING_PLUGIN_ID}`)).toBeTruthy();
  });

  it("does not load manifests again when every one loaded before", async () => {
    _setInstalledPlugins(["avandar.alpha", "avandar.beta"]);
    const { unmount } = _renderHost();
    await screen.findByText("Run avandar.alpha");
    unmount();

    _renderHost();
    await screen.findByText("Run avandar.alpha");

    expect(mocks.loadManifest).toHaveBeenCalledTimes(2);
  });

  it("does not load manifests again when installs arrive in another order", async () => {
    _setInstalledPlugins(["avandar.alpha", "avandar.beta"]);
    const { rerender } = _renderHost();
    await screen.findByText("Run avandar.alpha");

    _setInstalledPlugins(["avandar.beta", "avandar.alpha"]);
    rerender(
      <PluginHost>
        <ItemTitles />
      </PluginHost>,
    );

    expect(_countManifestLoadsOf("avandar.alpha")).toBe(1);
  });

  it("keeps listing loaded plugins while a newly installed one loads", async () => {
    _setInstalledPlugins(["avandar.alpha"]);
    const { rerender } = _renderHost();
    await screen.findByText("Run avandar.alpha");
    mocks.loadManifest.mockImplementation((entry: PluginIndexEntry) => {
      return entry.id === "avandar.beta"
        ? new Promise(() => {})
        : Promise.resolve(_makeManifestModule(entry.id));
    });

    _setInstalledPlugins(["avandar.alpha", "avandar.beta"]);
    rerender(
      <PluginHost>
        <ItemTitles />
      </PluginHost>,
    );

    await waitFor(() => {
      expect(_countManifestLoadsOf("avandar.beta")).toBe(1);
    });
    expect(screen.getByText("Run avandar.alpha")).toBeTruthy();
  });

  it("returns the same items on a rerender when nothing changed", async () => {
    _setInstalledPlugins(["avandar.alpha"]);
    const { rerender } = _renderHost();
    await screen.findByText("Run avandar.alpha");
    const itemsBeforeRerender = lastItems;

    rerender(
      <PluginHost>
        <ItemTitles />
      </PluginHost>,
    );

    expect(lastItems).toBe(itemsBeforeRerender);
  });

  it("keeps the loaded manifests out of the persisted query cache", async () => {
    _setInstalledPlugins(["avandar.alpha"]);

    _renderHost();
    await screen.findByText("Run avandar.alpha");

    const queries = queryClient.getQueryCache().getAll();
    expect(queries).toHaveLength(1);
    expect(queries[0]?.meta).toEqual({ persist: false });
  });

  it("refetches the installs of this workspace every time the host mounts", () => {
    _renderHost();

    expect(mocks.getAllArguments[0]).toEqual({
      where: { workspace_id: { eq: "workspace-id" } },
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  });
});
