import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCombiningCrosswalk } from "@/hooks/crosswalks/useCombiningCrosswalk/useCombiningCrosswalk";
import { renderHook } from "@/test-utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const mocks = vi.hoisted(() => {
  return {
    crosswalks: [] as unknown[],
    options: undefined as unknown,
    isError: false,
  };
});

vi.mock("@/clients/crosswalks/CrosswalkClient", () => {
  return {
    CrosswalkClient: {
      useGetAll: (options: unknown) => {
        mocks.options = options;
        return [mocks.crosswalks, false, { isError: mocks.isError }];
      },
    },
  };
});

const DATASET_ID = "dataset-combined" as Dataset.Id;

describe("useCombiningCrosswalk", () => {
  beforeEach(() => {
    mocks.crosswalks = [];
    mocks.isError = false;
  });

  it("finds the crosswalk whose combined dataset this is", () => {
    mocks.crosswalks = [
      {
        id: "crosswalk-1",
        name: "Borough line lists",
        outputDatasetId: DATASET_ID,
      },
    ];

    const { result } = renderHook(() => {
      return useCombiningCrosswalk(DATASET_ID);
    });

    expect(result.current.crosswalk).toMatchObject({ id: "crosswalk-1" });
    expect(mocks.options).toMatchObject({
      where: { output_dataset_id: { eq: DATASET_ID } },
    });
  });

  it("finds none for a dataset no crosswalk combined", () => {
    const { result } = renderHook(() => {
      return useCombiningCrosswalk(DATASET_ID);
    });

    expect(result.current).toEqual({
      crosswalk: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it("reports a failed lookup instead of saying no crosswalk combined it", () => {
    mocks.isError = true;

    const { result } = renderHook(() => {
      return useCombiningCrosswalk(DATASET_ID);
    });

    expect(result.current).toMatchObject({
      crosswalk: undefined,
      isError: true,
    });
  });

  it("reads nothing for a dataset that cannot be combined", () => {
    mocks.crosswalks = [{ id: "crosswalk-1", outputDatasetId: DATASET_ID }];

    const { result } = renderHook(() => {
      return useCombiningCrosswalk(DATASET_ID, { isEnabled: false });
    });

    expect(result.current).toEqual({
      crosswalk: undefined,
      isLoading: false,
      isError: false,
    });
    expect(mocks.options).toMatchObject({
      useQueryOptions: { enabled: false },
    });
  });
});
