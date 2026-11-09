import { prop, propEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { fetchMapLayerFeatureList } from "@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import { getExportFeatureTableCopy } from "@/views/GisApp/export/getExportFeatureTableCopy/getExportFeatureTableCopy";
import { getQueryLayersFromMapLayers } from "@/views/GisApp/layers/getQueryLayersFromMapLayers/getQueryLayersFromMapLayers";
import { formatFeatureListCell } from "@/views/GisApp/panels/FeatureListDrawer/formatFeatureListCell/formatFeatureListCell";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type {
  MapLayerFeatureList,
  MapLayerFeatureListSort,
} from "@/clients/maps/MapLayerFeatureList/MapLayerFeatureList.types";
import type { ExportFeatureTable } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type { I18n } from "@lingui/core";

type ListOptions = Readonly<{
  layer: MapLayer.T;
  featureList: AvaMapConfig.ExportFeatureList;
}>;

/** The listed layer, or undefined when it is gone or cannot list rows. */
function _getListedLayer(config: AvaMapConfig.T): MapLayer.T | undefined {
  const { featureList } = config.exportLayout;
  const layer =
    featureList === undefined
      ? undefined
      : config.layers.find(propEq("id", featureList.layerId));
  return layer !== undefined &&
    getFeatureListAccessFromMapLayer(layer) === "rows"
    ? layer
    : undefined;
}

/** Saved columns still in the layer's query, or the popup's when none are. */
function _getColumnIds(
  options: ListOptions,
): readonly QueryColumn.Id[] | "popup" {
  const { layer, featureList } = options;
  const columnIds = featureList.columnIds.filter((columnId) => {
    return layer.source.queryColumns.some(propEq("id", columnId));
  });
  return columnIds.length > 0 ? columnIds : "popup";
}

/** The saved sort as a row key, or the default when its column is gone. */
function _getSort(options: ListOptions): MapLayerFeatureListSort | undefined {
  const { sort } = options.featureList;
  const sortColumn =
    sort === undefined
      ? undefined
      : options.layer.source.queryColumns.find(propEq("id", sort.columnId));
  return sort === undefined || sortColumn === undefined
    ? undefined
    : {
        key: QueryColumn.getDerivedColumnName(sortColumn),
        direction: sort.direction,
      };
}

/** Each row's printed cells, one per column, formatted as in the drawer. */
function _getPrintedRows(
  options: Readonly<{ list: MapLayerFeatureList; i18n: I18n }>,
): string[][] {
  const { list, i18n } = options;
  return list.rows.map((row) => {
    return list.columns.map((column) => {
      return formatFeatureListCell({
        value: row[column.key],
        column,
        distanceUnit: list.distanceUnit,
        i18n,
      });
    });
  });
}

/**
 * Fetches the export's feature list at download time and turns it into the
 * strings the PDF prints.
 *
 * The rows come from `fetchMapLayerFeatureList`, the query the feature list
 * drawer runs, over the same query layers (`getQueryLayersFromMapLayers`),
 * with the map's AOI, time, and spatial filters as they are on screen, so
 * the printed list matches the drawer and the map. Only `list.columns` print,
 * so a row's hidden coordinates never reach the page, and distances print as
 * the drawer formats them, already in the buffer's unit. Returns undefined
 * when the layout has no feature list, or when its layer was removed or can
 * no longer list rows (not exact, or not drawn from rows).
 * @throws With a localized message when the workspace's datasets or columns
 * have not loaded yet, so a list is never printed from partial metadata.
 */
export async function loadExportFeatureTable(
  options: Readonly<{
    config: AvaMapConfig.T;
    workspaceId: Workspace.Id;
    datasets: readonly Dataset.T[] | undefined;
    datasetColumns: readonly DatasetColumn.T[] | undefined;
    i18n: I18n;
  }>,
): Promise<ExportFeatureTable | undefined> {
  const { workspaceId, datasets, datasetColumns, i18n } = options;
  const config: AvaMapConfig.T = {
    ...options.config,
    layers: getQueryLayersFromMapLayers(options.config.layers),
  };
  const { featureList } = config.exportLayout;
  const layer = _getListedLayer(config);
  if (featureList === undefined || layer === undefined) {
    return undefined;
  }
  if (datasets === undefined || datasetColumns === undefined) {
    // Shown to the user, so it is localized here.
    throw new Error(
      i18n._(msg`The map's data is still loading. Try again in a moment.`),
    );
  }
  const list = await fetchMapLayerFeatureList({
    config,
    layerId: layer.id,
    columnIds: _getColumnIds({ layer, featureList }),
    sort: _getSort({ layer, featureList }),
    limit: featureList.maxRows,
    workspaceId,
    datasets,
    datasetColumns,
    i18n,
  });
  return {
    ...getExportFeatureTableCopy({
      config,
      layer,
      totalCount: list.totalCount,
      shownCount: list.rows.length,
      i18n,
    }),
    headerLabels: list.columns.map(prop("label")),
    rows: _getPrintedRows({ list, i18n }),
  };
}
