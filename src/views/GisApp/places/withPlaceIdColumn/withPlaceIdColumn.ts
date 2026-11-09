import { Model } from "@avandar/models";
import { uuid } from "$/lib/uuid";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The places column that identifies a row. Edit, Move, and Delete read it. */
export const PLACE_ID_COLUMN_NAME = "place_id";

function _getPlacesDatasetId(
  layer: MapLayer.T,
  placesDatasetIds: ReadonlySet<Dataset.Id>,
): Dataset.Id | undefined {
  const dataSource = layer.source.dataSource;
  return dataSource &&
    Model.isOfModelType(dataSource, "Dataset") &&
    placesDatasetIds.has(dataSource.id)
    ? dataSource.id
    : undefined;
}

function _isPlaceIdColumn(column: QueryColumn.T): boolean {
  return QueryColumn.getDerivedColumnName(column) === PLACE_ID_COLUMN_NAME;
}

/**
 * A places column wrapped as a query column whose id is the dataset
 * column's id, so the same layer always builds the same query.
 */
function _makePlaceIdQueryColumn(column: DatasetColumn.T): QueryColumn.T {
  return Model.make("QueryColumn", {
    id: uuid<QueryColumn.Id>(column.id),
    baseColumn: column,
    aggregation: undefined,
  });
}

/**
 * Makes a places layer query and carry `place_id` on every feature, even
 * when its popup does not show that column, so the feature inspector can
 * edit, move, or delete the clicked place. Other layers come back unchanged.
 * The result is only for loading and drawing the layer; it is never saved.
 */
export function withPlaceIdColumn(
  options: Readonly<{
    layer: MapLayer.T;
    placesDatasetIds: ReadonlySet<Dataset.Id>;
    datasetColumns: readonly DatasetColumn.T[];
  }>,
): MapLayer.T {
  const { layer } = options;
  const datasetId = _getPlacesDatasetId(layer, options.placesDatasetIds);
  const datasetColumn = options.datasetColumns.find((column) => {
    return (
      column.datasetId === datasetId && column.name === PLACE_ID_COLUMN_NAME
    );
  });
  const queryColumn =
    layer.source.queryColumns.find(_isPlaceIdColumn) ??
    (datasetColumn ? _makePlaceIdQueryColumn(datasetColumn) : undefined);
  if (!datasetId || !queryColumn) {
    return layer;
  }
  const hasQueryColumn = layer.source.queryColumns.includes(queryColumn);
  const { columnIds } = layer.popup;
  const hasPopupColumn =
    columnIds === "all" || columnIds.includes(queryColumn.id);
  if (hasQueryColumn && hasPopupColumn) {
    return layer;
  }
  return {
    ...layer,
    source: {
      ...layer.source,
      queryColumns: hasQueryColumn
        ? layer.source.queryColumns
        : [...layer.source.queryColumns, queryColumn],
    },
    popup: {
      ...layer.popup,
      columnIds:
        columnIds === "all" || hasPopupColumn
          ? columnIds
          : [...columnIds, queryColumn.id],
    },
  };
}
