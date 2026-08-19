import { useMediaQuery } from "@mantine/hooks";
import { User } from "$/models/User/User";
import { isDesktop } from "$/platform/isDesktop";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { renderHook, TestProviders } from "@/test-utils";

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
  return {
    ...actual,
    useMediaQuery: vi.fn(() => {
      return true;
    }),
  };
});

const OWNER_ID = "11111111-1111-4111-8111-111111111111";

/** Renders the hook under the app's providers and returns its result. */
function _renderEligibility(): boolean {
  return renderHook(
    () => {
      return useNuxEligibility();
    },
    { wrapper: TestProviders },
  ).result.current;
}

function _workspace(
  overrides: Partial<ReturnType<typeof useCurrentWorkspace>> = {},
): ReturnType<typeof useCurrentWorkspace> {
  return {
    ownerId: OWNER_ID,
    subscription: { subscriptionStatus: "active" },
    ...overrides,
  } as ReturnType<typeof useCurrentWorkspace>;
}

beforeEach(() => {
  vi.mocked(useCurrentUser).mockReturnValue({
    id: OWNER_ID,
  } as ReturnType<typeof useCurrentUser>);
  vi.mocked(useCurrentWorkspace).mockReturnValue(_workspace());
  vi.mocked(useIsGlobalAdmin).mockReturnValue(false);
  vi.mocked(isDesktop).mockReturnValue(false);
  vi.mocked(useMediaQuery).mockReturnValue(true);
});

describe("useNuxEligibility", () => {
  it("is eligible for the workspace owner on desktop web", () => {
    expect(_renderEligibility()).toBe(true);
  });

  it("is eligible for a global admin who does not own the workspace", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue(
      _workspace({ ownerId: "other" as User.Id }),
    );
    vi.mocked(useIsGlobalAdmin).mockReturnValue(true);
    expect(_renderEligibility()).toBe(true);
  });

  it("is not eligible for a plain member", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue(
      _workspace({ ownerId: "other" as User.Id }),
    );
    expect(_renderEligibility()).toBe(false);
  });

  it("is not eligible before a plan is chosen", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue(
      _workspace({ subscription: undefined }),
    );
    expect(_renderEligibility()).toBe(false);
  });

  it("is not eligible when the subscription does not grant entitlements", () => {
    vi.mocked(useCurrentWorkspace).mockReturnValue(
      _workspace({
        subscription: {
          subscriptionStatus: "canceled",
        } as NonNullable<
          ReturnType<typeof useCurrentWorkspace>["subscription"]
        >,
      }),
    );
    expect(_renderEligibility()).toBe(false);
  });

  it("is not eligible in the desktop app", () => {
    vi.mocked(isDesktop).mockReturnValue(true);
    expect(_renderEligibility()).toBe(false);
  });

  it("is not eligible with no signed-in user", () => {
    vi.mocked(useCurrentUser).mockReturnValue(undefined);
    expect(_renderEligibility()).toBe(false);
  });

  it("is not eligible on a viewport narrower than the lg breakpoint", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);
    expect(_renderEligibility()).toBe(false);
  });
});
