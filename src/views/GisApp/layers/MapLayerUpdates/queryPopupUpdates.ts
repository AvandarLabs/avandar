import { makeMap, makeSet, prop, propEq, propPasses } from "@avandar/utils";
import { getRequiredColumnIds } from "./getRequiredColumnIds";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

/**
 * Length of the popup saved when the default was the source's first columns.
 *
 * A selection of exactly this many columns, in source order, is that old
 * default. It is widened to the whole row. Any other explicit selection was
 * chosen by the author and stays as it is.
 */
const LEGACY_DEFAULT_POPUP_COLUMN_COUNT = 12;

/** Finds a query column already selected on the layer by its id. */
function getQueryColumnFromLayer(
  options: Readonly<{
    layer: MapLayer.T;
    columnId: QueryColumn.Id | undefined;
  }>,
): QueryColumn.T | undefined {
  const { layer, columnId } = options;
  return columnId
    ? layer.source.queryColumns.find(propEq("id", columnId))
    : undefined;
}

/** Points the layer at a new data source, clearing what no longer applies. */
function withDataSource(
  options: Readonly<{
    layer: MapLayer.T;
    dataSource: QueryDataSource.T | undefined;
  }>,
): MapLayer.T {
  const { layer, dataSource } = options;
  const isUnchanged =
    layer.source.dataSource === dataSource &&
    layer.source.queryColumns.length === 0 &&
    layer.geoBinding === undefined &&
    layer.timeColumn === undefined &&
    layer.popup.columnIds === "all" &&
    layer.popup.action === undefined;
  if (isUnchanged) {
    return layer;
  }
  return {
    ...layer,
    source: { ...layer.source, dataSource, queryColumns: [] },
    geoBinding: undefined,
    timeColumn: undefined,
    popup: { columnIds: "all", action: undefined },
  };
}

function _buildPopupQueryColumns(
  options: Readonly<{
    layer: MapLayer.T;
    selected: readonly QueryColumn.T[];
  }>,
): QueryColumn.T[] {
  const { layer, selected } = options;
  const requiredIds = getRequiredColumnIds(layer);
  const selectedIds = makeSet(selected, { key: "id" });
  const existingIds = makeSet(layer.source.queryColumns, { key: "id" });
  return [
    ...layer.source.queryColumns.filter(
      propPasses("id", (columnId): columnId is QueryColumn.Id => {
        return requiredIds.has(columnId) || selectedIds.has(columnId);
      }),
    ),
    ...selected.filter(
      propPasses<QueryColumn.T, "id", QueryColumn.Id>(
        "id",
        (columnId): columnId is QueryColumn.Id => {
          return !existingIds.has(columnId);
        },
      ),
    ),
  ];
}

/** Sets which columns a feature's popup shows and queries. */
function withPopupColumns(
  options: Readonly<{
    layer: MapLayer.T;
    columns: readonly QueryColumn.T[];
  }>,
): MapLayer.T {
  const { layer, columns } = options;
  const existingByBaseColumnId = makeMap(layer.source.queryColumns, {
    keyFn: prop("baseColumn.id"),
  });
  const selected = columns.map((column) => {
    return existingByBaseColumnId.get(column.baseColumn.id) ?? column;
  });
  return {
    ...layer,
    popup: { ...layer.popup, columnIds: selected.map(prop("id")) },
    source: {
      ...layer.source,
      queryColumns: _buildPopupQueryColumns({ layer, selected }),
    },
  };
}

/** Whether the popup is still the old first-twelve-column default. */
function _isLegacyCappedPopup(
  options: Readonly<{
    layer: MapLayer.T;
    availableColumns: readonly QueryColumn.T[];
  }>,
): boolean {
  const { layer, availableColumns } = options;
  const { columnIds } = layer.popup;
  if (
    columnIds === "all" ||
    columnIds.length !== LEGACY_DEFAULT_POPUP_COLUMN_COUNT ||
    availableColumns.length <= LEGACY_DEFAULT_POPUP_COLUMN_COUNT
  ) {
    return false;
  }
  const prefix = availableColumns.slice(0, LEGACY_DEFAULT_POPUP_COLUMN_COUNT);
  return columnIds.every((columnId, index) => {
    const column = layer.source.queryColumns.find(propEq("id", columnId));
    return column?.baseColumn.id === prefix[index]?.baseColumn.id;
  });
}

/**
 * Selects every source column while the popup is still the default, so a
 * clicked feature shows the whole row.
 *
 * A popup that is exactly the first twelve source columns is the previous
 * default, so it is widened too. Any other explicit selection is unchanged.
 */
function withDefaultPopupColumns(
  options: Readonly<{
    layer: MapLayer.T;
    availableColumns: readonly QueryColumn.T[];
  }>,
): MapLayer.T {
  const { layer, availableColumns } = options;
  if (
    layer.popup.columnIds !== "all" &&
    !_isLegacyCappedPopup({ layer, availableColumns })
  ) {
    return layer;
  }
  return withPopupColumns({ layer, columns: availableColumns });
}

/** Sets the popup's optional click-through link. */
function withPopupAction(
  options: Readonly<{
    layer: MapLayer.T;
    action: MapLayer.PopupAction | undefined;
  }>,
): MapLayer.T {
  const { layer, action } = options;
  return { ...layer, popup: { ...layer.popup, action } };
}

/** Query, data-source, and popup updates for a map layer. */
export const queryPopupUpdates = {
  getQueryColumnFromLayer,
  withDataSource,
  withPopupColumns,
  withDefaultPopupColumns,
  withPopupAction,
};
