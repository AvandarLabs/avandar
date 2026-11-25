import { describe, expect, it } from "vitest";
import { getFeatureListRowLabel } from "@/views/GisApp/panels/FeatureListDrawer/getFeatureListRowLabel/getFeatureListRowLabel";
import type { MapLayerFeatureListColumn } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

function _sourceColumns(...keys: string[]): MapLayerFeatureListColumn[] {
  return keys.map((key) => {
    return { key, label: key, kind: "source" };
  });
}

describe("getFeatureListRowLabel", () => {
  it("prefers a column named like a name over an earlier code", () => {
    expect(
      getFeatureListRowLabel({
        columns: _sourceColumns("loc_code", "loc_name", "address"),
        row: {
          loc_code: "M260",
          loc_name: "The Clinton School",
          address: "10 East 15th Street",
        },
      }),
    ).toBe("The Clinton School");
  });

  it("falls back to the first text column that is not a code", () => {
    expect(
      getFeatureListRowLabel({
        columns: _sourceColumns("site_id", "zone_code", "title"),
        row: { site_id: "A1", zone_code: "Z9", title: "Harbor clinic" },
      }),
    ).toBe("Harbor clinic");
  });

  it("skips a blank name and a value that only looks like a code", () => {
    expect(
      getFeatureListRowLabel({
        columns: _sourceColumns("name", "ref", "description"),
        row: { name: " ", ref: "M260", description: "Old pier" },
      }),
    ).toBe("Old pier");
  });

  it("has no label when no column reads like a name", () => {
    expect(
      getFeatureListRowLabel({
        columns: [
          ..._sourceColumns("loc_code", "count"),
          { key: "__avandar_distance", label: "Distance", kind: "distance" },
        ],
        row: { loc_code: "M260", count: 4, __avandar_distance: 0.1 },
      }),
    ).toBeUndefined();
  });
});
