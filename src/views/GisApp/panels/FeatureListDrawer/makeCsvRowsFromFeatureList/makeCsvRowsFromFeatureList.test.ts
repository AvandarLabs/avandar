import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { makeCsvRowsFromFeatureList } from "./makeCsvRowsFromFeatureList";
import type { MapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";

const LIST: MapLayerFeatureList = {
  columns: [
    { key: "loc_name", label: "loc_name", kind: "source" },
    {
      key: "__avandar_distance",
      label: "Distance to nearest Sites",
      kind: "distance",
    },
    {
      key: "__avandar_nearest_label",
      label: "Nearest Sites",
      kind: "nearestLabel",
    },
  ],
  rows: [
    {
      loc_name: "The Clinton School",
      __avandar_distance: 0.0935,
      __avandar_nearest_label: "Union Square",
      __avandar_longitude: -73.99,
      __avandar_latitude: 40.73,
    },
  ],
  totalCount: 1,
  distanceUnit: "mi",
};

describe("makeCsvRowsFromFeatureList", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("keys each row by column label, with distance to two decimals in its unit", () => {
    expect(makeCsvRowsFromFeatureList({ list: LIST, i18n })).toEqual([
      {
        loc_name: "The Clinton School",
        "Distance to nearest Sites (mi)": 0.09,
        "Nearest Sites": "Union Square",
      },
    ]);
  });
});
