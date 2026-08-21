import { describe, expect, it, vi } from "vitest";

vi.mock("@sbfn/_shared/MiniServer/MiniServer.ts", () => {
  return {
    defineRoutes: (functionName: string, routes: Record<string, unknown>) => {
      return { [functionName]: routes };
    },
    POST: () => {
      const handler = {
        action: (action: unknown) => {
          return { state: { action } };
        },
        bodySchema: () => {
          return handler;
        },
      };
      return handler;
    },
  };
});

const { DashboardsRoutes } =
  await import("@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.ts");

type DashboardRow = {
  id: string;
  slug: string;
  visibility: "workspace" | "public";
  workspace_id: string;
};

type FakeClients = {
  supabaseClient: { rpc: ReturnType<typeof vi.fn> };
  supabaseAdminClient: { from: ReturnType<typeof vi.fn> };
  rpc: ReturnType<typeof vi.fn>;
  workspaceScopeFilters: Array<string | undefined>;
};

function _getMatchingDashboards(
  options: Readonly<{
    dashboards: DashboardRow[];
    filters: Record<string, string>;
  }>,
): DashboardRow[] {
  return options.dashboards.filter((dashboard) => {
    return (
      dashboard.slug === options.filters.slug &&
      dashboard.visibility === options.filters.visibility &&
      (options.filters.workspace_id === undefined ||
        dashboard.workspace_id === options.filters.workspace_id)
    );
  });
}

function _getSelectedWorkspace(
  options: Readonly<{
    filters: Record<string, string>;
    selectedColumns: string;
    subjectWorkspaceId: string | undefined;
  }>,
): { workspace_id: string } | null {
  const hasSelectedSubjectWorkspace =
    options.selectedColumns === "workspace_id" &&
    options.filters.id !== undefined &&
    options.subjectWorkspaceId !== undefined;
  return hasSelectedSubjectWorkspace ?
      { workspace_id: options.subjectWorkspaceId }
    : null;
}

function _makeDashboardQueryResult(
  options: Readonly<{
    dashboards: DashboardRow[];
    filters: Record<string, string>;
    workspaceScopeFilters: Array<string | undefined>;
  }>,
): Promise<{ data: DashboardRow[]; error: null }> {
  options.workspaceScopeFilters.push(options.filters.workspace_id);
  return Promise.resolve({
    data: _getMatchingDashboards({
      dashboards: options.dashboards,
      filters: options.filters,
    }),
    error: null,
  });
}

function _createFakeQuery(
  options: Readonly<{
    dashboards: DashboardRow[];
    subjectWorkspaceId: string | undefined;
    workspaceScopeFilters: Array<string | undefined>;
  }>,
): Record<string, unknown> {
  let selectedColumns = "";
  const filters: Record<string, string> = {};
  const query: Record<string, unknown> = {
    select: vi.fn((columns: string) => {
      selectedColumns = columns;
      return query;
    }),
    eq: vi.fn((column: string, value: string) => {
      filters[column] = value;
      return query;
    }),
    maybeSingle: vi.fn(async () => {
      return {
        data: _getSelectedWorkspace({
          filters,
          selectedColumns,
          subjectWorkspaceId: options.subjectWorkspaceId,
        }),
        error: null,
      };
    }),
    then: <TResult>(
      onfulfilled?:
        | ((value: { data: DashboardRow[]; error: null }) => TResult)
        | null,
    ) => {
      return _makeDashboardQueryResult({
        dashboards: options.dashboards,
        filters,
        workspaceScopeFilters: options.workspaceScopeFilters,
      }).then(onfulfilled);
    },
  };
  return query;
}

function _createFakeClients(
  options: Readonly<{
    canEditSubject?: boolean;
    dashboards?: DashboardRow[];
    subjectWorkspaceId?: string;
  }>,
): FakeClients {
  const dashboards = options.dashboards ?? [];
  const workspaceScopeFilters: Array<string | undefined> = [];
  const rpc = vi.fn(async () => {
    return { data: options.canEditSubject ?? true, error: null };
  });
  const from = vi.fn(() => {
    return _createFakeQuery({
      dashboards,
      subjectWorkspaceId: options.subjectWorkspaceId,
      workspaceScopeFilters,
    });
  });

  return {
    supabaseClient: { rpc },
    supabaseAdminClient: { from },
    rpc,
    workspaceScopeFilters,
  };
}

type ValidateSlugOptions = {
  clients: ReturnType<typeof _createFakeClients>;
  dashboardId?: string;
  slug: string;
  visibility: "workspace" | "public";
};

async function _validateSlug(
  options: ValidateSlugOptions,
): Promise<{ isValid: true } | { isValid: false; reason: string }> {
  const { clients, dashboardId, slug, visibility } = options;

  return await DashboardsRoutes.dashboards["/validate-slug"].POST.state.action({
    body: { slug, dashboardId, visibility },
    info: undefined,
    pathParams: undefined,
    queryParams: undefined,
    request: new Request("https://example.test/validate-slug"),
    supabaseAdminClient: clients.supabaseAdminClient,
    supabaseClient: clients.supabaseClient,
    user: undefined,
  } as never);
}

describe("DashboardsRoutes /validate-slug", () => {
  it("rejects a public slug that exists in the global namespace", async () => {
    const clients = _createFakeClients({
      dashboards: [
        {
          id: "public-dashboard",
          slug: "revenue",
          visibility: "public",
          workspace_id: "workspace-a",
        },
      ],
    });

    await expect(
      _validateSlug({ clients, slug: "revenue", visibility: "public" }),
    ).resolves.toEqual({ isValid: false, reason: "taken" });
  });

  it("rejects a workspace slug that exists in the subject workspace", async () => {
    const clients = _createFakeClients({
      dashboards: [
        {
          id: "existing-dashboard",
          slug: "revenue",
          visibility: "workspace",
          workspace_id: "workspace-a",
        },
      ],
      subjectWorkspaceId: "workspace-a",
    });

    await expect(
      _validateSlug({
        clients,
        dashboardId: "subject-dashboard",
        slug: "revenue",
        visibility: "workspace",
      }),
    ).resolves.toEqual({ isValid: false, reason: "taken" });
    expect(clients.workspaceScopeFilters).toEqual(["workspace-a"]);
  });

  it("accepts a workspace slug used only in a different workspace", async () => {
    const clients = _createFakeClients({
      dashboards: [
        {
          id: "other-workspace-dashboard",
          slug: "revenue",
          visibility: "workspace",
          workspace_id: "workspace-b",
        },
      ],
      subjectWorkspaceId: "workspace-a",
    });

    await expect(
      _validateSlug({
        clients,
        dashboardId: "subject-dashboard",
        slug: "revenue",
        visibility: "workspace",
      }),
    ).resolves.toEqual({ isValid: true });
  });

  it("excludes the subject dashboard from a workspace collision", async () => {
    const clients = _createFakeClients({
      dashboards: [
        {
          id: "subject-dashboard",
          slug: "revenue",
          visibility: "workspace",
          workspace_id: "workspace-a",
        },
      ],
      subjectWorkspaceId: "workspace-a",
    });

    await expect(
      _validateSlug({
        clients,
        dashboardId: "subject-dashboard",
        slug: "revenue",
        visibility: "workspace",
      }),
    ).resolves.toEqual({ isValid: true });
  });

  it("rejects a workspace validation without a dashboard id", async () => {
    const clients = _createFakeClients({ subjectWorkspaceId: "workspace-a" });

    await expect(
      _validateSlug({ clients, slug: "revenue", visibility: "workspace" }),
    ).resolves.toEqual({ isValid: false, reason: "taken" });
    expect(clients.rpc).not.toHaveBeenCalled();
  });

  it("does not distinguish foreign and nonexistent subject dashboards", async () => {
    const clients = _createFakeClients({
      canEditSubject: false,
      subjectWorkspaceId: "workspace-b",
    });

    await expect(
      _validateSlug({
        clients,
        dashboardId: "foreign-dashboard",
        slug: "revenue",
        visibility: "workspace",
      }),
    ).resolves.toEqual({ isValid: false, reason: "taken" });
    expect(clients.rpc).toHaveBeenCalledWith(
      "util__auth_user_can_access_resource",
      {
        p_min_role: "editor",
        p_resource_id: "foreign-dashboard",
        p_resource_type: "dashboard",
      },
    );
    expect(clients.workspaceScopeFilters).toEqual([]);
  });
});
