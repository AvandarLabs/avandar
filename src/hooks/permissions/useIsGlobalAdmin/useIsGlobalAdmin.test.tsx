import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { renderHook } from "@/test-utils";

vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return { useUserAppRoles: vi.fn() };
});

describe("useIsGlobalAdmin", () => {
  beforeEach(() => {
    vi.mocked(useUserAppRoles).mockReset();
  });

  it("is true when settings app role is admin", () => {
    vi.mocked(useUserAppRoles).mockReturnValue([
      {
        data_sources: "viewer",
        data_explorer: "viewer",
        dashboards: "viewer",
        gis: "viewer",
        settings: "admin",
      },
      false,
    ]);

    const { result } = renderHook(() => {
      return useIsGlobalAdmin();
    });

    expect(result.current).toBe(true);
  });

  it("is false while roles are loading", () => {
    vi.mocked(useUserAppRoles).mockReturnValue([undefined, true]);

    const { result } = renderHook(() => {
      return useIsGlobalAdmin();
    });

    expect(result.current).toBe(false);
  });

  it("is false when settings is not admin", () => {
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
      return useIsGlobalAdmin();
    });

    expect(result.current).toBe(false);
  });
});
