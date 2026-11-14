import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useCombiningProgress } from "@/views/DataManagerApp/CrosswalkView/CombineStep/useCombiningProgress/useCombiningProgress";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const KINGS = "d0000000-0000-4000-8000-000000000001" as Dataset.Id;
const QUEENS = "d0000000-0000-4000-8000-000000000002" as Dataset.Id;
const NESTED = "d0000000-0000-4000-8000-000000000009" as Dataset.Id;

function _renderProgress(readKey: string | undefined) {
  return renderHook(
    (props: { readKey: string | undefined }) => {
      return useCombiningProgress([KINGS, QUEENS], props.readKey);
    },
    { initialProps: { readKey } },
  );
}

describe("useCombiningProgress", () => {
  it("counts each stacked dataset once, and nothing it did not stack", () => {
    const { result } = _renderProgress("read-1");

    act(() => {
      const onRelationFetched = result.current.startRead("read-1");
      onRelationFetched(KINGS);
      onRelationFetched(KINGS);
      onRelationFetched(NESTED);
    });

    expect(result.current.readCount).toBe(1);
    expect(result.current.totalCount).toBe(2);
  });

  it("starts each read from none", () => {
    const { result } = _renderProgress("read-1");

    act(() => {
      result.current.startRead("read-1")(QUEENS);
    });
    act(() => {
      result.current.startRead("read-1");
    });

    expect(result.current.readCount).toBe(0);
  });

  it("counts none for a new key until its read starts", () => {
    const { result, rerender } = _renderProgress("read-1");
    act(() => {
      const onRelationFetched = result.current.startRead("read-1");
      onRelationFetched(KINGS);
      onRelationFetched(QUEENS);
    });
    expect(result.current.readCount).toBe(2);

    rerender({ readKey: "read-2" });

    expect(result.current.readCount).toBe(0);
  });

  it("ignores a report from a read that is no longer current", () => {
    const { result, rerender } = _renderProgress("read-1");
    let staleListener = (_datasetId: Dataset.Id): void => {};
    act(() => {
      staleListener = result.current.startRead("read-1");
    });

    rerender({ readKey: "read-2" });
    act(() => {
      result.current.startRead("read-2");
    });
    act(() => {
      staleListener(KINGS);
      staleListener(QUEENS);
    });

    expect(result.current.readCount).toBe(0);
  });
});
