import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useCombiningProgress } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const KINGS = "d0000000-0000-4000-8000-000000000001" as Dataset.Id;
const QUEENS = "d0000000-0000-4000-8000-000000000002" as Dataset.Id;
const NESTED = "d0000000-0000-4000-8000-000000000009" as Dataset.Id;

describe("useCombiningProgress", () => {
  it("counts each stacked dataset once, and nothing it did not stack", () => {
    const { result } = renderHook(() => {
      return useCombiningProgress([KINGS, QUEENS]);
    });

    act(() => {
      result.current.onRelationFetched(KINGS);
      result.current.onRelationFetched(KINGS);
      result.current.onRelationFetched(NESTED);
    });

    expect(result.current.readCount).toBe(1);
    expect(result.current.totalCount).toBe(2);
  });

  it("starts again from none", () => {
    const { result } = renderHook(() => {
      return useCombiningProgress([KINGS, QUEENS]);
    });

    act(() => {
      result.current.onRelationFetched(QUEENS);
      result.current.reset();
    });

    expect(result.current.readCount).toBe(0);
  });
});
