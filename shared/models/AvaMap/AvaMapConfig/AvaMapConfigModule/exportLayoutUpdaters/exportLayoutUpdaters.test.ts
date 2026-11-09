import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.ts";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";

describe("exportLayoutUpdaters", () => {
  it("defaults a new map to A4 landscape with no disclaimer", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(config.exportLayout.paper).toBe("a4");
    expect(config.exportLayout.orientation).toBe("landscape");
    expect(config.exportLayout.disclaimer).toBeUndefined();
  });

  it("stores an edited layout", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        paper: "letter",
        title: { isVisible: true, text: "Cholera response" },
      },
    });

    expect(config.exportLayout.paper).toBe("letter");
    expect(config.exportLayout.title.text).toBe("Cholera response");
  });

  it("returns the same config when nothing changed", () => {
    const config = AvaMapConfig.makeEmpty();

    expect(
      AvaMapConfig.withExportLayout({
        config,
        exportLayout: config.exportLayout,
      }),
    ).toBe(config);
  });

  it("stores a cleared disclaimer as unset rather than blank", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        disclaimer: "   ",
      },
    });

    expect(config.exportLayout.disclaimer).toBeUndefined();
  });

  it("stores a padded disclaimer trimmed rather than verbatim", () => {
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: {
        ...AvaMapConfig.defaultExportLayout,
        disclaimer: "  Data unverified  ",
      },
    });

    expect(config.exportLayout.disclaimer).toBe("Data unverified");
  });

  it("defaults a new map to no feature list", () => {
    expect(AvaMapConfig.makeEmpty().exportLayout.featureList).toBeUndefined();
  });

  it("stores a changed feature list sort direction", () => {
    const columnId = uuid<QueryColumn.Id>();
    const featureList: AvaMapConfig.ExportFeatureList = {
      layerId: uuid<MapLayer.Id>(),
      columnIds: [columnId],
      sort: { columnId, direction: "asc" },
      maxRows: 200,
    };
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: { ...AvaMapConfig.defaultExportLayout, featureList },
    });

    const nextConfig = AvaMapConfig.withExportLayout({
      config,
      exportLayout: {
        ...config.exportLayout,
        featureList: { ...featureList, sort: { columnId, direction: "desc" } },
      },
    });

    expect(nextConfig.exportLayout.featureList?.sort?.direction).toBe("desc");
  });

  it("returns the same config when an equal feature list is applied", () => {
    const featureList: AvaMapConfig.ExportFeatureList = {
      layerId: uuid<MapLayer.Id>(),
      columnIds: [uuid<QueryColumn.Id>()],
      sort: undefined,
      maxRows: 200,
    };
    const config = AvaMapConfig.withExportLayout({
      config: AvaMapConfig.makeEmpty(),
      exportLayout: { ...AvaMapConfig.defaultExportLayout, featureList },
    });

    expect(
      AvaMapConfig.withExportLayout({
        config,
        exportLayout: {
          ...config.exportLayout,
          featureList: {
            ...featureList,
            columnIds: [...featureList.columnIds],
          },
        },
      }),
    ).toBe(config);
  });
});
