import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test-utils";
import { useCombineAccess } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombineAccess/useCombineAccess";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    canCreateDatasets: true,
    isUnderDatasetLimit: true,
    role: [undefined, false, false] as readonly [
      string | null | undefined,
      boolean,
      boolean,
    ],
  };
});

vi.mock("@/hooks/workspaces/useCanCreateDatasets/useCanCreateDatasets", () => {
  return {
    useCanCreateDatasets: () => {
      return mocks.canCreateDatasets;
    },
  };
});
vi.mock(
  "@/hooks/datasets/useIsUnderDatasetLimit/useIsUnderDatasetLimit",
  () => {
    return {
      useIsUnderDatasetLimit: () => {
        return mocks.isUnderDatasetLimit;
      },
    };
  },
);
vi.mock("@/hooks/permissions/useResourceRole/useResourceRole", () => {
  return {
    useResourceRole: () => {
      return mocks.role;
    },
  };
});

const COMBINED_ID = "55555555-5555-4555-8555-555555555555" as Dataset.Id;

function _access(outputDatasetId: Dataset.Id | undefined) {
  return renderHook(() => {
    return useCombineAccess(outputDatasetId);
  }).result.current;
}

describe("useCombineAccess", () => {
  beforeEach(() => {
    mocks.canCreateDatasets = true;
    mocks.isUnderDatasetLimit = true;
    mocks.role = [undefined, false, false];
  });

  it("lets a workspace admin under the dataset limit create", () => {
    expect(_access(undefined)).toEqual({ status: "allowed" });
  });

  it("refuses to create for someone who can't add datasets, or past the limit", () => {
    mocks.canCreateDatasets = false;
    expect(_access(undefined)).toEqual({
      status: "denied",
      reason: "not_admin",
    });
    mocks.canCreateDatasets = true;
    mocks.isUnderDatasetLimit = false;
    expect(_access(undefined)).toEqual({
      status: "denied",
      reason: "dataset_limit",
    });
  });

  it("updates only with edit access to the combined dataset", () => {
    expect(_access(COMBINED_ID)).toEqual({ status: "checking" });
    mocks.role = ["editor", false, false];
    expect(_access(COMBINED_ID)).toEqual({ status: "allowed" });
    mocks.role = ["viewer", false, false];
    expect(_access(COMBINED_ID)).toEqual({
      status: "denied",
      reason: "not_dataset_editor",
    });
    mocks.role = [null, false, false];
    expect(_access(COMBINED_ID)).toEqual({
      status: "denied",
      reason: "not_dataset_editor",
    });
    mocks.role = [undefined, false, true];
    expect(_access(COMBINED_ID)).toEqual({
      status: "denied",
      reason: "failed",
    });
  });
});
