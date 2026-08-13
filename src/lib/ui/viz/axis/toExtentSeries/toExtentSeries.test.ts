import { describe, expect, it } from "vitest";
import { toExtentSeries } from "@/lib/ui/viz/axis/toExtentSeries/toExtentSeries";

describe("toExtentSeries", () => {
  it("leaves every series unstacked when there is no shared stack", () => {
    expect(
      toExtentSeries({
        series: [{ key: "v" }, { key: "w" }],
        sharedStackId: undefined,
      }),
    ).toEqual([
      { key: "v", stackId: undefined },
      { key: "w", stackId: undefined },
    ]);
  });

  it("puts every series in the shared stack when there is one", () => {
    expect(
      toExtentSeries({
        series: [{ key: "v" }, { key: "w" }],
        sharedStackId: "stack",
      }),
    ).toEqual([
      { key: "v", stackId: "stack" },
      { key: "w", stackId: "stack" },
    ]);
  });

  it("lets a per-series stack id win over the shared one", () => {
    expect(
      toExtentSeries({
        series: [{ key: "v", stackId: "g1" }, { key: "w" }],
        sharedStackId: "stack",
      }),
    ).toEqual([
      { key: "v", stackId: "g1" },
      { key: "w", stackId: "stack" },
    ]);
  });

  it("keeps per-series stack ids when there is no shared stack", () => {
    expect(
      toExtentSeries({
        series: [
          { key: "v", stackId: "g1" },
          { key: "w", stackId: "g1" },
          { key: "z" },
        ],
        sharedStackId: undefined,
      }),
    ).toEqual([
      { key: "v", stackId: "g1" },
      { key: "w", stackId: "g1" },
      { key: "z", stackId: undefined },
    ]);
  });
});
