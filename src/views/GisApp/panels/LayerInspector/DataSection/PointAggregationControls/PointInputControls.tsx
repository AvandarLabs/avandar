import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { PointCoordinateSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointCoordinateSelect";
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
};

function _findColumn(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): QueryColumn.T | null {
  return MapLayerUpdates.getQueryColumnFromLayer({ layer, columnId }) ?? null;
}

/** Edits the point geometry column or latitude/longitude pair. */
export function PointInputControls({
  layer,
  binding,
  updatePoints,
}: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const { points } = binding;
  if (points.type === "geometryColumn") {
    return (
      <QueryColumnSingleSelect
        label={t`Point geometry column`}
        placeholder={t`Select a point geometry column`}
        dataSourceId={dataSourceId}
        value={_findColumn(layer, points.column)}
        onChange={(column) => {
          if (column) {
            updatePoints({ ...points, column: column.id });
          }
        }}
      />
    );
  }
  return (
    <>
      <PointCoordinateSelect
        layer={layer}
        binding={binding}
        updatePoints={updatePoints}
        axis="latitude"
      />
      <PointCoordinateSelect
        layer={layer}
        binding={binding}
        updatePoints={updatePoints}
        axis="longitude"
      />
    </>
  );
}
