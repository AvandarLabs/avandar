import { where } from "@avandar/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginInstallationClient } from "@/clients/plugins/PluginInstallationClient/PluginInstallationClient";
import { cleanup, fireEvent, render, screen, waitFor } from "@/test-utils";
import { usePluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type DatabaseRow = Record<string, unknown>;

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000004";
const INSTALLED_BY = "00000000-0000-4000-8000-000000000009";

const fakeDatabase = vi.hoisted(() => {
  return {
    rows: [] as Array<Record<string, unknown>>,
  };
});

type QueryState = {
  operation: "select" | "update" | "delete";
  payload: DatabaseRow;
  filters: Array<[string, unknown]>;
};

function _getMatchingRows(state: QueryState): DatabaseRow[] {
  return fakeDatabase.rows.filter((row) => {
    return state.filters.every(([column, value]) => {
      return row[column] === value;
    });
  });
}

function _runQuery(state: QueryState): unknown {
  const matchingRows = _getMatchingRows(state);
  if (state.operation === "update") {
    matchingRows.forEach((row) => {
      Object.assign(row, state.payload);
    });
    return matchingRows[0];
  }
  if (state.operation === "delete") {
    fakeDatabase.rows = fakeDatabase.rows.filter((row) => {
      return !matchingRows.includes(row);
    });
    return null;
  }
  return matchingRows;
}

const mocks = vi.hoisted(() => {
  return { openUninstallPluginModal: vi.fn() };
});

vi.mock(
  "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/openUninstallPluginModal",
  () => {
    return { openUninstallPluginModal: mocks.openUninstallPluginModal };
  },
);
vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {
          from: () => {
            const state: QueryState = {
              operation: "select",
              payload: {},
              filters: [],
            };
            const query = {
              select: () => {
                return query;
              },
              update: (payload: DatabaseRow) => {
                state.operation = "update";
                state.payload = payload;
                return query;
              },
              delete: () => {
                state.operation = "delete";
                return query;
              },
              eq: (column: string, value: unknown) => {
                state.filters.push([column, value]);
                return query;
              },
              range: () => {
                return query;
              },
              overrideTypes: () => {
                return query;
              },
              single: () => {
                return query;
              },
              throwOnError: () => {
                return Promise.resolve({ data: _runQuery(state) });
              },
            };
            return query;
          },
        };
      },
    },
  };
});

const MANIFEST = {
  id: "avandar.epidemiology",
  version: "1.2.0",
  permissions: ["data:context"],
} as unknown as PluginManifest;

const MANIFEST_MODULE = {
  manifest: MANIFEST,
  strings: {},
  icons: {},
} as unknown as PluginManifestModule;

let queryClient: QueryClient;

function _seedInstallation(overrides: DatabaseRow): void {
  fakeDatabase.rows.push({
    id: "00000000-0000-4000-8000-000000000101",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    installed_by: INSTALLED_BY,
    workspace_id: WORKSPACE_ID,
    plugin_id: MANIFEST.id,
    installed_version: "1.0.0",
    granted_permissions: [],
    is_enabled: true,
    ...overrides,
  });
}

/**
 * Reads installs the way the running plugin host does: the same client call
 * and the same workspace filter. If an action fails to invalidate that query,
 * the listed text below stays stale.
 */
function Harness(): ReactNode {
  const [installations = [], isLoading] = PluginInstallationClient.useGetAll(
    where("workspace_id", "eq", WORKSPACE_ID),
  );
  const installation = installations[0];
  const actions = usePluginInstallationActions({
    pluginName: "Epidemiology",
    manifestModule: MANIFEST_MODULE,
    installation,
    headingId: "card-heading",
  });
  return (
    <div>
      <p>
        {isLoading ? "loading" : null}
        {installation
          ? `${installation.pluginId} enabled=${installation.isEnabled} version=${installation.installedVersion} granted=${installation.grantedPermissions.join(",")}`
          : "no installation"}
      </p>
      <button
        type="button"
        onClick={() => {
          actions.setIsEnabled(false);
        }}
      >
        disable
      </button>
      <button type="button" onClick={actions.approvePermissions}>
        approve
      </button>
      <button type="button" onClick={actions.uninstall}>
        uninstall
      </button>
      <button
        type="button"
        onClick={(event) => {
          actions.uninstallWithImportedDatasets(event.currentTarget);
        }}
      >
        uninstall with datasets
      </button>
    </div>
  );
}

function QueryWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

async function _renderAfterFirstLoad(): Promise<void> {
  render(<Harness />, { wrapper: QueryWrapper });
  await waitFor(() => {
    expect(screen.queryByText(/loading/)).toBeNull();
  });
}

describe("usePluginInstallationActions", () => {
  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    fakeDatabase.rows = [];
    mocks.openUninstallPluginModal.mockClear();
  });

  it("shows a disabled install to the host's installs query right away", async () => {
    _seedInstallation({});
    await _renderAfterFirstLoad();

    fireEvent.click(screen.getByText("disable"));

    expect(await screen.findByText(/enabled=false/)).toBeInTheDocument();
  });

  it("shows re-approved permissions and version right away", async () => {
    _seedInstallation({ granted_permissions: [] });
    await _renderAfterFirstLoad();

    fireEvent.click(screen.getByText("approve"));

    expect(
      await screen.findByText(/version=1\.2\.0 granted=data:context/),
    ).toBeInTheDocument();
  });

  it("drops an uninstalled plugin from the host's installs query right away", async () => {
    _seedInstallation({});
    await _renderAfterFirstLoad();

    fireEvent.click(screen.getByText("uninstall"));

    expect(await screen.findByText("no installation")).toBeInTheDocument();
  });

  it("opens the uninstall modal with the install's ids, the button that opened it and the card heading, and deletes nothing", async () => {
    _seedInstallation({});
    await _renderAfterFirstLoad();

    fireEvent.click(screen.getByText("uninstall with datasets"));

    expect(mocks.openUninstallPluginModal).toHaveBeenCalledWith({
      pluginName: "Epidemiology",
      pluginId: MANIFEST.id,
      installationId: "00000000-0000-4000-8000-000000000101",
      opener: screen.getByText("uninstall with datasets"),
      headingId: "card-heading",
    });
    expect(fakeDatabase.rows).toHaveLength(1);
  });
});
