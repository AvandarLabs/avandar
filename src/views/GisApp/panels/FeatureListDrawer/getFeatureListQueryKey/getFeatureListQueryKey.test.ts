import { describe, expect, it } from "vitest";
import { createSitesAndSchoolsFixture } from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.fixtures";
import { getFeatureListQueryKey } from "@/views/GisApp/panels/FeatureListDrawer/getFeatureListQueryKey/getFeatureListQueryKey";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

function _withLayerReplaced(
  config: AvaMapConfig.T,
  layer: MapLayer.T,
): AvaMapConfig.T {
  return {
    ...config,
    layers: config.layers.map((candidate) => {
      return candidate.id === layer.id ? layer : candidate;
    }),
  };
}

describe("getFeatureListQueryKey", () => {
  it("does not change when another layer is restyled", () => {
    const { config, schools, sites } = createSitesAndSchoolsFixture();
    const restyled = _withLayerReplaced(config, {
      ...sites,
      isVisible: false,
      symbology: {
        ...sites.symbology,
        color: { type: "single", color: "#ff0000" },
      },
    } as MapLayer.T);

    expect(
      getFeatureListQueryKey({ config: restyled, layer: schools }),
    ).toEqual(getFeatureListQueryKey({ config, layer: schools }));
  });

  it("does not change when an unrelated layer is added", () => {
    const { config, schools, sites } = createSitesAndSchoolsFixture();
    const withExtraLayer = {
      ...config,
      layers: [...config.layers, { ...sites, id: "other" as MapLayer.Id }],
    };

    expect(
      getFeatureListQueryKey({ config: withExtraLayer, layer: schools }),
    ).toEqual(getFeatureListQueryKey({ config, layer: schools }));
  });

  it("changes when the buffer the layer is filtered by changes", () => {
    const { config, schools, buffer } = createSitesAndSchoolsFixture();
    if (buffer.geoBinding?.type !== "bufferOfLayer") {
      throw new Error("The fixture buffer must buffer a layer");
    }
    const widened = _withLayerReplaced(config, {
      ...buffer,
      geoBinding: { ...buffer.geoBinding, distanceMeters: 1609 },
    });

    expect(
      getFeatureListQueryKey({ config: widened, layer: schools }),
    ).not.toEqual(getFeatureListQueryKey({ config, layer: schools }));
  });

  it("changes when the buffered layer's source changes", () => {
    const { config, schools, sites } = createSitesAndSchoolsFixture();
    const refiltered = _withLayerReplaced(config, {
      ...sites,
      source: { ...sites.source, limit: 1 },
    });

    expect(
      getFeatureListQueryKey({ config: refiltered, layer: schools }),
    ).not.toEqual(getFeatureListQueryKey({ config, layer: schools }));
  });

  it("changes when the listed layer's popup columns change", () => {
    const { config, schools } = createSitesAndSchoolsFixture();
    const layer = { ...schools, popup: { ...schools.popup, columnIds: [] } };

    expect(
      getFeatureListQueryKey({
        config: _withLayerReplaced(config, layer),
        layer,
      }),
    ).not.toEqual(getFeatureListQueryKey({ config, layer: schools }));
  });

  it("changes when the map's time window changes", () => {
    const { config, schools } = createSitesAndSchoolsFixture();
    const withTimeRange: AvaMapConfig.T = {
      ...config,
      timeRange: { start: "2020-01-01", end: "2020-12-31" },
    };

    expect(
      getFeatureListQueryKey({ config: withTimeRange, layer: schools }),
    ).not.toEqual(getFeatureListQueryKey({ config, layer: schools }));
  });
});
