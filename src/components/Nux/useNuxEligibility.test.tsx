import { isDesktop } from "$/platform/isDesktop";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { renderHook, TestProviders } from "@/test-utils";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility";

vi.mock("@/hooks/users/useCurrentUser", () => {
  return { useCurrentUser: vi.fn() };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return { useCurrentWorkspace: vi.fn() };
});
vi.mock("@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin", () => {
  return { useIsGlobalAdmin: vi.fn() };
});
vi.mock("$/platform/isDesktop", () => {
  return { isDesktop: vi.fn() };
});
vi.mock("@mantine/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/hooks")>();
  return { ...actual, useMediaQuery: vi.fn(() => true) };
});

const OWNER_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.mocked(useCurrentUser).mockReturnValue({ id: OWNER_ID } as never);
  vi.mocked(useCurrentWorkspace).mockReturnValue({ ownerId: OWNER_ID } as never);
  vi.mocked(useIsGlobalAdmin).mockReturnValue(false);
  vi.mocked(isDesktop).mockReturnValue(false);
});

describe("useNuxEligibility", () => {
  it("is eligible for the workspace owner on desktop web", () => {
    expect(
      renderHook(() => useNuxEligibility(), { wrapper: TestProviders }).result
        .current,
    ).toBe(true);
  });

  it("is eligible for a global admin who does not own the workspace", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue({ ownerId: "other" } as never);
    vi.mocked(useIsGlobalAdmin).mockReturnValue(true);
    expect(
      renderHook(() => useNuxEligibility(), { wrapper: TestProviders }).result
        .current,
    ).toBe(true);
  });

  it("is not eligible for a plain member", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue({ ownerId: "other" } as never);
    expect(
      renderHook(() => useNuxEligibility(), { wrapper: TestProviders }).result
        .current,
    ).toBe(false);
  });

  it("is not eligible in the desktop app", () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    expect(
      renderHook(() => useNuxEligibility(), { wrapper: TestProviders }).result
        .current,
    ).toBe(false);
  });
});
