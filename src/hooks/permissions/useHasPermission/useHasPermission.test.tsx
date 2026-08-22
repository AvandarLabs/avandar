import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { renderHook } from "@/test-utils";

vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return { useUserAppRoles: vi.fn() };
});

describe("useHasPermission", () => {
  beforeEach(() => {
    vi.mocked(useUserAppRoles).mockReset();
  });

  it("grants viewer keys for a dashboards viewer", () => {
    vi.mocked(useUserAppRoles).mockReturnValue([
      {
        data_sources: undefined,
        data_explorer: undefined,
        dashboards: "viewer",
        gis: undefined,
        settings: undefined,
      },
      false,
    ]);

    const { result } = renderHook(() => {
      return useHasPermission("dashboards__can_view_dashboard");
    });

    expect(result.current).toBe(true);
  });

  it("denies editor keys for a dashboards viewer", () => {
    vi.mocked(useUserAppRoles).mockReturnValue([
      {
        data_sources: undefined,
        data_explorer: undefined,
        dashboards: "viewer",
        gis: undefined,
        settings: undefined,
      },
      false,
    ]);

    const { result } = renderHook(() => {
      return useHasPermission("dashboards__can_edit_dashboard");
    });

    expect(result.current).toBe(false);
  });

  it("denies settings keys when the user has no settings role", () => {
    vi.mocked(useUserAppRoles).mockReturnValue([
      {
        data_sources: "admin",
        data_explorer: "admin",
        dashboards: "admin",
        gis: "admin",
        settings: undefined,
      },
      false,
    ]);

    const { result } = renderHook(() => {
      return useHasPermission("settings__can_manage_workspace_users");
    });

    expect(result.current).toBe(false);
  });
});
