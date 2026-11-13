import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useApplyAccess } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    access: {
      canEdit: true,
      isLoading: false,
      canViewDictionaries: true,
      areAppRolesLoading: false,
      isRoleResolved: true,
      hasRoleFailed: false,
    },
  };
});

vi.mock("@/hooks/permissions/useResourceRole/useResourceRole", () => {
  return {
    useResourceRole: () => {
      const role = !mocks.access.isRoleResolved
        ? undefined
        : mocks.access.canEdit
          ? "editor"
          : "viewer";
      return [
        role,
        mocks.access.isLoading,
        mocks.access.hasRoleFailed,
      ] as const;
    },
  };
});
vi.mock("@/hooks/permissions/useUserAppRoles/useUserAppRoles", () => {
  return {
    useUserAppRoles: () => {
      return mocks.access.areAppRolesLoading
        ? ([undefined, true] as const)
        : ([{}, false] as const);
    },
  };
});
vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return mocks.access.canViewDictionaries;
    },
  };
});
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return mocks.navigateMock;
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-1", slug: "demo" };
    },
  };
});
vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: mocks.notifyErrorMock };
});

const DATASET = { id: "dataset-1", name: "Kings line list" } as Dataset.T;

describe("useApplyAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access = {
      canEdit: true,
      isLoading: false,
      canViewDictionaries: true,
      areAppRolesLoading: false,
      isRoleResolved: true,
      hasRoleFailed: false,
    };
  });

  it("lets in someone who can edit the dataset and read dictionaries", () => {
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("allowed");
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it("sends someone who cannot edit the dataset back to it, once", () => {
    mocks.access.canEdit = false;
    const { result, rerender } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );
    rerender();

    expect(result.current).toBe("denied");
    expect(mocks.notifyErrorMock).toHaveBeenCalledTimes(1);
    expect(mocks.navigateMock).toHaveBeenCalledTimes(1);
  });

  it("waits while the role is loading", () => {
    mocks.access.isLoading = true;
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("checking");
  });

  it("waits while app roles load", () => {
    mocks.access.areAppRolesLoading = true;
    mocks.access.canViewDictionaries = false;
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("checking");
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });

  it("waits until the dataset role has been read", () => {
    mocks.access.isRoleResolved = false;
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("checking");
    expect(mocks.notifyErrorMock).not.toHaveBeenCalled();
  });

  it("reports a failure when the dataset role cannot be read", () => {
    mocks.access.isRoleResolved = false;
    mocks.access.hasRoleFailed = true;
    const { result } = renderHook(
      () => {
        return useApplyAccess(DATASET);
      },
      { wrapper: TestProviders },
    );

    expect(result.current).toBe("failed");
    expect(mocks.navigateMock).not.toHaveBeenCalled();
  });
});
