import { describe, expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { getExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";

function _config(): AvaMapConfig.T {
  const layer = {
    ...MapLayer.createArea("Attack rate"),
    legend: {
      ...MapLayer.createArea("Attack rate").legend,
      title: "Attack rate by health zone",
    },
  };
  return AvaMapConfig.withLayerAdded({
    config: AvaMapConfig.makeEmpty(),
    layer,
  });
}

describe("getExportFurnitureText", () => {
  it("falls back to the map resource name for an empty title", () => {
    expect(
      getExportFurnitureText({
        config: _config(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre, OpenStreetMap contributors",
      }).title,
    ).toBe("Cholera response");
  });

  it("uses the stored title verbatim when set", () => {
    const config = AvaMapConfig.withExportLayout({
      config: _config(),
      exportLayout: {
        ..._config().exportLayout,
        title: { isVisible: true, text: "North Kivu" },
      },
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).title,
    ).toBe("North Kivu");
  });

  it("omits an invisible title even when text is stored", () => {
    const config = AvaMapConfig.withExportLayout({
      config: _config(),
      exportLayout: {
        ..._config().exportLayout,
        title: { isVisible: false, text: "North Kivu" },
      },
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).title,
    ).toBeUndefined();
  });

  it("falls back to the top visible layer's legend title for the subtitle", () => {
    expect(
      getExportFurnitureText({
        config: _config(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBe("Attack rate by health zone");
  });

  it("reads the top of the stack when several layers are present", () => {
    const bottomLayer = {
      ...MapLayer.createArea("Population"),
      legend: {
        ...MapLayer.createArea("Population").legend,
        title: "Population density",
      },
    };
    const topLayer = {
      ...MapLayer.createArea("Attack rate"),
      legend: {
        ...MapLayer.createArea("Attack rate").legend,
        title: "Attack rate by health zone",
      },
    };
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.withLayerAdded({
        config: AvaMapConfig.makeEmpty(),
        layer: bottomLayer,
      }),
      layer: topLayer,
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBe("Attack rate by health zone");
  });

  it("skips an invisible top layer and falls back to the next visible one", () => {
    const bottomLayer = {
      ...MapLayer.createArea("Population"),
      legend: {
        ...MapLayer.createArea("Population").legend,
        title: "Population density",
      },
    };
    const topLayer = {
      ...MapLayer.createArea("Attack rate"),
      isVisible: false,
      legend: {
        ...MapLayer.createArea("Attack rate").legend,
        title: "Attack rate by health zone",
      },
    };
    const config = AvaMapConfig.withLayerAdded({
      config: AvaMapConfig.withLayerAdded({
        config: AvaMapConfig.makeEmpty(),
        layer: bottomLayer,
      }),
      layer: topLayer,
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBe("Population density");
  });

  it("has no subtitle when there is no visible data layer", () => {
    expect(
      getExportFurnitureText({
        config: AvaMapConfig.makeEmpty(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBeUndefined();
  });

  it("omits an invisible subtitle even when a visible layer has a legend title", () => {
    const config = AvaMapConfig.withExportLayout({
      config: _config(),
      exportLayout: {
        ..._config().exportLayout,
        subtitle: { isVisible: false, text: "" },
      },
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).subtitle,
    ).toBeUndefined();
  });

  it("composes the source line from visible layers and the basemap", () => {
    expect(
      getExportFurnitureText({
        config: _config(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre, OpenStreetMap contributors",
      }).sourceLine,
    ).toContain("MapLibre, OpenStreetMap contributors");
  });

  it("uses the stored source line verbatim when set", () => {
    const config = AvaMapConfig.withExportLayout({
      config: _config(),
      exportLayout: {
        ..._config().exportLayout,
        sourceLine: "Ministry of Health line list",
      },
    });

    expect(
      getExportFurnitureText({
        config,
        mapName: "Cholera response",
        basemapAttribution: "MapLibre",
      }).sourceLine,
    ).toBe("Ministry of Health line list");
  });

  it("falls back to just the basemap attribution when no layer has a named data source", () => {
    expect(
      getExportFurnitureText({
        config: AvaMapConfig.makeEmpty(),
        mapName: "Cholera response",
        basemapAttribution: "MapLibre, OpenStreetMap contributors",
      }).sourceLine,
    ).toBe("MapLibre, OpenStreetMap contributors");
  });
});
