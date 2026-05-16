import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGrantedPermissionKeysForAppRole,
  parseAppTypeFromPermissionKey,
} from "@/hooks/permissions/permissionCatalogUtils";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles";
import type { Permissions } from "$/models/Permissions/Permissions";
import type { ReactNode } from "react";

const WS = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const { fromMock } = vi.hoisted(() => {
  return { fromMock: vi.fn() };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: USER };
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: WS };
    },
  };
});

vi.mock("$/db/supabase/AvaSupabase.ts", () => {
  return {
    AvaSupabase: {
      db: () => ({ from: fromMock }),
    },
  };
});

function _membershipSelectChain(result: {
  data: unknown;
  error: unknown;
}): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => {
    return builder;
  });
  builder.eq = vi.fn(() => {
    return builder;
  });
  builder.maybeSingle = vi.fn(() => {
    return {
      throwOnError: vi.fn(() => {
        return Promise.resolve(result);
      }),
    };
  });
  return builder;
}

function _wrapperForHook(options: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, options.children);
}

describe("useUserAppRoles", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("loads role_group_app_roles into a per-app record", async () => {
    fromMock.mockImplementation(() => {
      return _membershipSelectChain({
        data: {
          role_group_id: "rg-1",
          role_groups: {
            role_group_app_roles: [
              { app: "settings", role: "admin" },
              { app: "dashboards", role: "viewer" },
            ],
          },
        },
        error: null,
      });
    });

    const { result } = renderHook(
      () => {
        return useUserAppRoles();
      },
      { wrapper: _wrapperForHook },
    );

    await waitFor(() => {
      expect(result.current[1]).toBe(false);
    });

    expect(result.current[0]?.settings).toBe("admin");
    expect(result.current[0]?.dashboards).toBe("viewer");
    expect(result.current[0]?.data_sources).toBeUndefined();
  });
});

describe("parseAppTypeFromPermissionKey", () => {
  it("resolves data_sources keys", () => {
    expect(
      parseAppTypeFromPermissionKey("data_sources__can_edit_dataset"),
    ).toBe("data_sources");
  });

  it("returns undefined for unknown prefixes", () => {
    expect(
      parseAppTypeFromPermissionKey("unknown__x" as Permissions.PermissionKey),
    ).toBe(undefined);
  });
});

describe("getGrantedPermissionKeysForAppRole", () => {
  it("includes viewer and editor keys for an editor", () => {
    const keys = getGrantedPermissionKeysForAppRole({
      app: "dashboards",
      role: "editor",
    });
    expect(keys.has("dashboards__can_view_dashboard")).toBe(true);
    expect(keys.has("dashboards__can_edit_dashboard")).toBe(true);
    expect(keys.has("dashboards__can_manage_dashboards")).toBe(false);
  });
});
