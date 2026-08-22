import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type PointAggregationBinding = Extract<
  MapLayer.GeoBinding,
  { type: "aggregatePointsToBoundaries" }
>;

type Props = {
  layer: MapLayer.T;
  binding: PointAggregationBinding;
  updatePoints: (points: MapLayer.PointBinding) => void;
  axis: "latitude" | "longitude";
};

function _findColumn(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): QueryColumn.T | null {
  return MapLayerUpdates.getQueryColumnFromLayer({ layer, columnId }) ?? null;
}

/** Selects one lat/lng axis for point aggregation. */
export function PointCoordinateSelect({
  layer,
  binding,
  updatePoints,
  axis,
}: Props): ReactNode {
  const { t } = useLingui();
  const { points } = binding;
  if (points.type !== "latLngColumns") {
    return null;
  }
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const label = axis === "latitude" ? t`Latitude` : t`Longitude`;
  return (
    <QueryColumnSingleSelect
      label={label}
      placeholder={t`Select a column`}
      dataSourceId={dataSourceId}
      value={_findColumn(layer, points[axis])}
      onChange={(column) => {
        updatePoints({ ...points, [axis]: column?.id });
      }}
    />
  );
}
