import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getExportFeatureTableCopy } from "@/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy";

/** Exposure sites, an 805 m buffer typed in `distanceUnit`, and its schools. */
function _bufferedMap(distanceUnit: MapLayer.BufferDistanceUnit): {
  config: AvaMapConfig.T;
  schools: MapLayer.T;
} {
  const sites = MapLayer.makeEmpty("Exposure sites");
  const buffer: MapLayer.T = {
    ...MapLayer.createArea("Buffer of Exposure sites"),
    geoBinding: {
      type: "bufferOfLayer",
      layerId: sites.id,
      distanceMeters: 805,
      distanceUnit,
      labelColumn: undefined,
      dissolve: false,
    },
  };
  const schools: MapLayer.T = {
    ...MapLayer.makeEmpty("Schools"),
    spatialFilter: { layerId: buffer.id },
  };
  return {
    config: { ...AvaMapConfig.makeEmpty(), layers: [sites, buffer, schools] },
    schools,
  };
}

/** A map holding only an unfiltered "Schools" layer. */
function _unfilteredMap(): { config: AvaMapConfig.T; schools: MapLayer.T } {
  const schools = MapLayer.makeEmpty("Schools");
  return {
    config: { ...AvaMapConfig.makeEmpty(), layers: [schools] },
    schools,
  };
}

describe("getExportFeatureTableCopy", () => {
  beforeAll(() => {
    i18n.loadAndActivate({ locale: "en", messages: {} });
  });

  it("states the count and layer name when no buffer filters the layer", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 42,
      shownCount: 42,
      i18n,
    });

    expect(copy.summaryLine).toBe("42 Schools");
  });

  it("states the buffer distance and source when a buffer filters the layer", () => {
    const { config, schools } = _bufferedMap("mi");
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 42,
      shownCount: 42,
      i18n,
    });

    expect(copy.summaryLine).toBe("42 Schools within 0.5 mi of Exposure sites");
  });

  it("states the buffer distance in the unit it was typed in", () => {
    const { config, schools } = _bufferedMap("m");
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 3,
      shownCount: 3,
      i18n,
    });

    expect(copy.summaryLine).toBe("3 Schools within 805 m of Exposure sites");
  });

  it("adds a truncation note when the row cap cut the list", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 1500,
      shownCount: 200,
      i18n,
    });

    expect(copy.truncationNote).toBe(
      "Showing 200 of 1,500. Download the full list as CSV from the map.",
    );
  });

  it("adds no truncation note when every row is shown", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 12,
      shownCount: 12,
      i18n,
    });

    expect(copy.truncationNote).toBeUndefined();
  });

  it("notes the columns left out when every row is shown", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 12,
      shownCount: 12,
      i18n,
    });

    expect(copy.buildColumnLimitNote({ shownCount: 10, totalCount: 40 })).toBe(
      "Showing 10 of 40 columns. Download the full list as CSV from the map.",
    );
  });

  it("notes the rows and columns left out in one sentence when both are cut", () => {
    const { config, schools } = _unfilteredMap();
    const copy = getExportFeatureTableCopy({
      config,
      layer: schools,
      totalCount: 1500,
      shownCount: 200,
      i18n,
    });

    expect(copy.buildColumnLimitNote({ shownCount: 10, totalCount: 40 })).toBe(
      "Showing 200 of 1,500 rows and 10 of 40 columns. Download the full list as CSV from the map.",
    );
  });
});
