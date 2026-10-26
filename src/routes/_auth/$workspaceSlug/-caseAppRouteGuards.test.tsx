/**
 * Route guards on the Case Manager, the create-case-type form, and Records:
 * which app role opens each one, and which app the access-denied page names
 * when the role is missing.
 */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "$/models/Permissions/Permissions";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions";

vi.mock("$/env/getSupabaseApiUrl.ts", () => {
  return {
    getSupabaseApiUrl: () => {
      return "http://test.local";
    },
  };
});

vi.mock("$/env/getSupabaseApiKey.ts", () => {
  return {
    getSupabaseApiKey: () => {
      return "test-anon-key";
    },
  };
});

const {
  getWorkspacesOfCurrentUserMock,
  getCurrentSessionMock,
  getUserAppRolesMock,
} = vi.hoisted(() => {
  return {
    getWorkspacesOfCurrentUserMock: vi.fn(),
    getCurrentSessionMock: vi.fn(),
    getUserAppRolesMock: vi.fn(),
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      withCache: () => {
        return {
          withFetchQuery: () => {
            return {
              getWorkspacesOfCurrentUser: getWorkspacesOfCurrentUserMock,
            };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/AuthClient/AuthClient", () => {
  return { AuthClient: { getCurrentSession: getCurrentSessionMock } };
});

vi.mock("@/clients/UserClient", () => {
  return {
    UserClient: {
      withCache: () => {
        return {
          withFetchQuery: () => {
            return { getUserAppRoles: getUserAppRolesMock };
          },
        };
      },
    },
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { getById: vi.fn() } };
});

vi.mock("@/views/OntologyDesignerApp", () => {
  return { OntologyDesignerApp: vi.fn() };
});

vi.mock("@/views/OntologyDesignerApp/ConceptCreatorView", () => {
  return { ConceptCreatorView: vi.fn() };
});

vi.mock(
  "@/views/OntologyDesignerApp/ConceptCreatorView/ConceptCreatorStore",
  () => {
    return { ConceptCreatorStore: { Provider: vi.fn() } };
  },
);

vi.mock("@/views/IndividualManagerApp", () => {
  return { IndividualManagerApp: vi.fn() };
});

const { Route: caseManagerRoute } = await import("./ontology-designer/route");
const { Route: caseTypeCreatorRoute } = await import(
  "./ontology-designer/concept-creator"
);
const { Route: caseRecordsRoute } = await import(
  "./individual-manager/$conceptId/route"
);

type GuardedRoute = { options: { beforeLoad?: unknown } };
type BeforeLoad = (args: {
  context: { queryClient: QueryClient };
  params: { workspaceSlug: string; conceptId: string };
}) => Promise<void>;

const WORKSPACE = { id: "22222222-2222-4222-8222-222222222222", slug: "acme" };

function _getBeforeLoad(route: GuardedRoute): BeforeLoad {
  if (route.options.beforeLoad === undefined) {
    throw new Error("The route must define beforeLoad.");
  }
  return route.options.beforeLoad as BeforeLoad;
}

function _runGuard(options: {
  route: GuardedRoute;
  roles: Partial<UserAppRolesMatrix>;
}): Promise<void> {
  getUserAppRolesMock.mockResolvedValue({
    ...Permissions.RolesMatrix.Builtins.EmptyMatrix,
    ...options.roles,
  });
  return _getBeforeLoad(options.route)({
    context: { queryClient: new QueryClient() },
    params: {
      workspaceSlug: WORKSPACE.slug,
      conceptId: "33333333-3333-4333-8333-333333333333",
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getWorkspacesOfCurrentUserMock.mockResolvedValue([WORKSPACE]);
  getCurrentSessionMock.mockResolvedValue({ user: { id: "user-1" } });
});

describe("Case Manager route guard", () => {
  it("sends a member with no case_types role to the Case Types access-denied page", async () => {
    await expect(
      _runGuard({ route: caseManagerRoute, roles: { case_records: "admin" } }),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        search: { app: "Case Types" },
      },
    });
  });

  it("opens the Case Manager for a case_types viewer", async () => {
    await expect(
      _runGuard({ route: caseManagerRoute, roles: { case_types: "viewer" } }),
    ).resolves.toBeUndefined();
  });
});

describe("create case type route guard", () => {
  it("sends a case_types viewer to the Case Types access-denied page", async () => {
    await expect(
      _runGuard({
        route: caseTypeCreatorRoute,
        roles: { case_types: "viewer" },
      }),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        search: { app: "Case Types" },
      },
    });
  });

  it("opens the create form for a case_types editor", async () => {
    await expect(
      _runGuard({
        route: caseTypeCreatorRoute,
        roles: { case_types: "editor" },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("Records route guard", () => {
  it("sends a member with no case_records role to the Case Records access-denied page", async () => {
    await expect(
      _runGuard({ route: caseRecordsRoute, roles: { case_types: "admin" } }),
    ).rejects.toMatchObject({
      options: {
        to: "/$workspaceSlug/access-denied",
        search: { app: "Case Records" },
      },
    });
  });

  it("opens Records for a case_records viewer", async () => {
    await expect(
      _runGuard({
        route: caseRecordsRoute,
        roles: { case_records: "viewer" },
      }),
    ).resolves.toBeUndefined();
  });
});
