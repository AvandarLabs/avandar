import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { formatFeatureListCell } from "./formatFeatureListCell";
import type { MapLayerFeatureListColumn } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

const DISTANCE_COLUMN: MapLayerFeatureListColumn = {
  key: "__avandar_distance",
  label: "Distance to nearest Sites",
  kind: "distance",
};

const NAME_COLUMN: MapLayerFeatureListColumn = {
  key: "loc_name",
  label: "loc_name",
  kind: "source",
};

describe("formatFeatureListCell", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("shows a distance to two decimals in the buffer's unit", () => {
    expect(
      formatFeatureListCell({
        value: 0.0935,
        column: DISTANCE_COLUMN,
        distanceUnit: "mi",
        i18n,
      }),
    ).toBe("0.09 mi");
  });

  it("shows a blank cell as empty text", () => {
    expect(
      formatFeatureListCell({
        value: undefined,
        column: NAME_COLUMN,
        distanceUnit: "mi",
        i18n,
      }),
    ).toBe("");
  });

  it("shows a source value as it is", () => {
    expect(
      formatFeatureListCell({
        value: "The Clinton School",
        column: NAME_COLUMN,
        distanceUnit: "mi",
        i18n,
      }),
    ).toBe("The Clinton School");
  });
});
