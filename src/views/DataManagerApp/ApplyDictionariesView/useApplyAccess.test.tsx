import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useApplyAccess } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    navigateMock: vi.fn(),
    notifyErrorMock: vi.fn(),
    access: { canEdit: true, isLoading: false, canViewDictionaries: true },
  };
});

vi.mock("@/hooks/datasets/useCanEditDataset/useCanEditDataset", () => {
  return {
    useCanEditDataset: () => {
      return {
        canEdit: mocks.access.canEdit,
        isLoading: mocks.access.isLoading,
      };
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
});
