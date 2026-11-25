import { describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useApplyStepLabels } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyStepLabels";

function _labels(options: Parameters<typeof useApplyStepLabels>[0]) {
  return renderHook(
    () => {
      return useApplyStepLabels(options);
    },
    { wrapper: TestProviders },
  ).result.current;
}

describe("useApplyStepLabels", () => {
  it("counts unmatched values and names the last step by what it does", () => {
    expect(
      _labels({
        isConverting: true,
        isLinkedDataset: false,
        unmatchedCount: 3,
      }),
    ).toEqual({
      match: "Match columns",
      unmatched: "Unmatched values (3)",
      save: "Save as",
    });
    expect(
      _labels({
        isConverting: false,
        isLinkedDataset: false,
        unmatchedCount: undefined,
      }),
    ).toEqual({
      match: "Match columns",
      unmatched: "Unmatched values",
      save: "Attach",
    });
    expect(
      _labels({ isConverting: true, isLinkedDataset: true, unmatchedCount: 0 })
        .save,
    ).toBe("Save");
  });
});
