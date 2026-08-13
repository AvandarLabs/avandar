/**
 * Area's layout-to-stacking rule, which drives the value extent. Kept
 * as a pure unit test because `AreaChart` renders Recharts primitives
 * directly and is documented as exempt from the renderer prop-mock
 * pattern in `SeriesRenderer.props.test.tsx`.
 */
import { describe, expect, it } from "vitest";
import { getAreaStacking } from "@/lib/ui/viz/axis/getAreaStacking/getAreaStacking";

describe("getAreaStacking", () => {
  it("keeps series independent in the default layout", () => {
    expect(getAreaStacking("default")).toEqual({
      isPercent: false,
      sharedStackId: undefined,
    });
  });

  it("shares one stack when stacked", () => {
    expect(getAreaStacking("stacked")).toEqual({
      isPercent: false,
      sharedStackId: "1",
    });
  });

  it("treats split as stacked, because it stacks by sign", () => {
    expect(getAreaStacking("split")).toEqual({
      isPercent: false,
      sharedStackId: "1",
    });
  });

  it("flags percent, which Recharts normalizes to a 0-to-1 domain", () => {
    expect(getAreaStacking("percent")).toEqual({
      isPercent: true,
      sharedStackId: "1",
    });
  });
});
