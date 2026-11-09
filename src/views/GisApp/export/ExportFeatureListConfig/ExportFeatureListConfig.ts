import { prop } from "@avandar/utils";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues";
import { getFeatureListAccessFromMapLayer } from "@/clients/maps/MapLayerFeatureList/getFeatureListAccessFromMapLayer/getFeatureListAccessFromMapLayer";
import { getFeatureListQueryColumns } from "@/clients/maps/MapLayerFeatureList/getFeatureListQueryColumns/getFeatureListQueryColumns";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";

/**
 * The columns the feature list drawer shows by default: the popup's, without
 * the layer's bound geometry or latitude and longitude columns.
 */
function _getPopupColumnIds(layer: MapLayer.T): QueryColumn.Id[] {
  return getFeatureListQueryColumns(layer, "popup").map(prop("id"));
}

/** A new list for `layer`: its popup columns, default order, 200 rows. */
function _createFromLayer(layer: MapLayer.T): AvaMapConfig.ExportFeatureList {
  return {
    layerId: layer.id,
    columnIds: _getPopupColumnIds(layer),
    sort: undefined,
    maxRows: AvaMapConfigValues.exportFeatureListDefaultMaxRows,
  };
}

/** Defaults and pure edits behind the export sheet's feature list section. */
export const ExportFeatureListConfig = {
  /** The most rows a feature list may print. */
  maxRows: AvaMapConfigValues.exportFeatureListMaxRows,

  /**
   * Layers a feature list may print, top of the stack first: the layers the
   * feature list drawer lists rows for. A jittered or aggregate-only layer
   * is left out because exact rows would undo its protection, and a boundary
   * join, bin, or buffer because its features are not rows.
   */
  getEligibleLayers: (config: AvaMapConfig.T): MapLayer.T[] => {
    return AvaMapConfig.toStackOrder(config).filter((layer) => {
      return getFeatureListAccessFromMapLayer(layer) === "rows";
    });
  },

  /** A new feature list for `layer`, with the drawer's columns. */
  createFromLayer: _createFromLayer,

  /** Points the list at another layer, keeping only the row cap. */
  withLayer: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      layer: MapLayer.T;
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    return {
      ..._createFromLayer(options.layer),
      maxRows: options.featureList.maxRows,
    };
  },

  /**
   * Sets the checked columns, in the layer's column order. A sort on a column
   * that is no longer checked falls back to the default order.
   */
  withColumns: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      layer: MapLayer.T;
      selectedIds: readonly string[];
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    const { featureList, layer, selectedIds } = options;
    const columnIds = layer.source.queryColumns
      .map(prop("id"))
      .filter((columnId) => {
        return selectedIds.includes(columnId);
      });
    const isSortKept =
      featureList.sort !== undefined &&
      columnIds.includes(featureList.sort.columnId);
    return {
      ...featureList,
      columnIds,
      sort: isSortKept ? featureList.sort : undefined,
    };
  },

  /**
   * Sorts by a listed column, keeping the current direction (ascending when
   * none). Any other value, such as the "default" option, clears the sort.
   */
  withSortColumn: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      columnId: string | null;
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    const { featureList, columnId } = options;
    const sortColumnId = featureList.columnIds.find((candidate) => {
      return candidate === columnId;
    });
    return {
      ...featureList,
      sort:
        sortColumnId === undefined
          ? undefined
          : {
              columnId: sortColumnId,
              direction: featureList.sort?.direction ?? "asc",
            },
    };
  },

  /** Changes the direction of a set sort. The default order has none. */
  withSortDirection: (
    options: Readonly<{
      featureList: AvaMapConfig.ExportFeatureList;
      direction: string;
    }>,
  ): AvaMapConfig.ExportFeatureList => {
    const { featureList, direction } = options;
    if (featureList.sort === undefined) {
      return featureList;
    }
    return {
      ...featureList,
      sort: {
        ...featureList.sort,
        direction: direction === "desc" ? "desc" : "asc",
      },
    };
  },
};
