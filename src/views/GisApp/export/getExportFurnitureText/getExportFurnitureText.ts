import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

import { prop } from "@avandar/utils";

/** Header and footer strings the page prints, with fallbacks resolved. */
export type ExportFurnitureText = {
  title: string | undefined;
  subtitle: string | undefined;
  sourceLine: string;
};

/** The top (last-drawn) visible layer, or `undefined` when none is visible. */
function _topVisibleLayer(
  layers: readonly MapLayer.T[],
): MapLayer.T | undefined {
  return layers.findLast(prop("isVisible"));
}

/**
 * The visible layers' data-source names, in stack order, with unnamed
 * sources (a layer whose query has no source yet) dropped.
 */
function _visibleDataSourceNames(layers: readonly MapLayer.T[]): string[] {
  return layers
    .filter(prop("isVisible"))
    .map((layer) => {
      return layer.source.dataSource?.name;
    })
    .filter((name): name is string => {
      return name !== undefined;
    });
}

/** Composes the source line from the visible layers and the basemap. */
function _composeSourceLine(
  options: Readonly<{
    layers: readonly MapLayer.T[];
    basemapAttribution: string;
  }>,
): string {
  const dataSourceNames = _visibleDataSourceNames(options.layers);
  return [...dataSourceNames, options.basemapAttribution].join(", ");
}

/**
 * Resolves the three fallback-bearing furniture strings.
 *
 * A stored empty string means "use the live fallback", which is why the sheet
 * shows the fallback as a placeholder rather than pre-filling the input: an
 * author who renames the map should not be left with a stale printed title.
 */
export function getExportFurnitureText(
  options: Readonly<{
    config: AvaMapConfig.T;
    mapName: string;
    basemapAttribution: string;
  }>,
): ExportFurnitureText {
  const { config, mapName, basemapAttribution } = options;
  const { exportLayout } = config;

  const title = !exportLayout.title.isVisible
    ? undefined
    : exportLayout.title.text !== ""
      ? exportLayout.title.text
      : mapName;

  const subtitle = !exportLayout.subtitle.isVisible
    ? undefined
    : exportLayout.subtitle.text !== ""
      ? exportLayout.subtitle.text
      : _topVisibleLayer(config.layers)?.legend.title;

  const sourceLine =
    exportLayout.sourceLine !== ""
      ? exportLayout.sourceLine
      : _composeSourceLine({ layers: config.layers, basemapAttribution });

  return { title, subtitle, sourceLine };
}
