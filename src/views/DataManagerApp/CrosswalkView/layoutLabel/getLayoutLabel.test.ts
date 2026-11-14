import { describe, expect, it } from "vitest";
import { CONTEXT } from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  BRONX_LAYOUT,
  KINGS_LAYOUT,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import { getLayoutLabel } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/getLayoutLabel";

describe("getLayoutLabel", () => {
  it("names a layout after its first dataset and counts the others", () => {
    expect(getLayoutLabel(KINGS_LAYOUT, CONTEXT.datasetsById)).toEqual({
      firstDatasetName: "Kings line list 2026-03",
      otherDatasetCount: 1,
    });
    expect(getLayoutLabel(BRONX_LAYOUT, CONTEXT.datasetsById)).toEqual({
      firstDatasetName: "Bronx line list",
      otherDatasetCount: 0,
    });
  });

  it("has no name for a layout with no dataset", () => {
    expect(getLayoutLabel({ datasetIds: [] }, CONTEXT.datasetsById)).toEqual({
      firstDatasetName: undefined,
      otherDatasetCount: 0,
    });
  });
});
