import { describe, expect, it } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useCrosswalkStepLabels } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkStepLabels/useCrosswalkStepLabels";

describe("useCrosswalkStepLabels", () => {
  it("names the last step Update once the combined dataset exists", () => {
    const labelsFor = (hasCombinedDataset: boolean) => {
      return renderHook(
        () => {
          return useCrosswalkStepLabels({ hasCombinedDataset });
        },
        { wrapper: TestProviders },
      ).result.current;
    };

    expect(labelsFor(false)).toEqual({
      datasets: "Choose datasets",
      map: "Map each dataset",
      combine: "Create combined dataset",
    });
    expect(labelsFor(true).combine).toBe("Update combined dataset");
  });
});
