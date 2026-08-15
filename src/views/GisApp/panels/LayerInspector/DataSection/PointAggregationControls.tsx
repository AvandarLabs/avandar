import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AreaAggregationControls } from "./AreaAggregationControls";
import type { BoundarySourceOption } from "./useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  options: readonly BoundarySourceOption[];
  sourceColumns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

type PointAggregationBinding = Extract<
  MapLayer.GeoBinding,
  { type: "aggregatePointsToBoundaries" }
>;

function _createBoundaryFromOption(
  option: BoundarySourceOption,
): MapLayer.BoundarySource | undefined {
  const geometryColumn = option.columns[0];
  const keyColumn = option.columns[1];
  if (!geometryColumn || !keyColumn) {
    return undefined;
  }
  return {
    datasetId: option.dataset.id,
    geometryColumnId: geometryColumn.id,
    geometryEncoding: "wkt",
    keyColumnId: keyColumn.id,
    displayNameColumnId: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

function _findColumn(
  layer: MapLayer.T,
  columnId: QueryColumn.Id | undefined,
): QueryColumn.T | null {
  return MapLayerUpdates.getQueryColumnFromLayer({ layer, columnId }) ?? null;
}

/**
 * Edits point input, polygon boundaries, and the resulting area aggregation.
 */
export function PointAggregationControls(props: Props): ReactNode {
  const { t } = useLingui();
  const binding = props.layer.geoBinding;
  if (binding?.type !== "aggregatePointsToBoundaries") {
    return null;
  }
  const dataSourceId =
    props.layer.source.dataSource ?
      Model.getTypedId(props.layer.source.dataSource)
    : undefined;
  const updatePoints = (points: MapLayer.PointBinding): void => {
    props.onLayerChange((current) => {
      return MapLayerUpdates.withPointAggregation(current, {
        points,
        boundary: binding.boundary,
        pointColumns: props.sourceColumns,
      });
    });
  };
  return (
    <>
      <Select
        label={t`Point geometry`}
        data={[
          { value: "latLngColumns", label: t`Latitude and longitude columns` },
          { value: "geometryColumn", label: t`Point geometry column` },
        ]}
        value={binding.points.type}
        allowDeselect={false}
        onChange={(value) => {
          updatePoints(
            value === "geometryColumn" && props.sourceColumns[0] ?
              {
                type: "geometryColumn",
                column: props.sourceColumns[0].id,
                encoding: "wkt",
                family: "point",
                simplification: undefined,
              }
            : {
                type: "latLngColumns",
                latitude: undefined,
                longitude: undefined,
              },
          );
        }}
      />
      <PointInputControls
        {...props}
        binding={binding}
        updatePoints={updatePoints}
      />
      <PointBoundaryControls {...props} binding={binding} />
      <AreaAggregationControls
        layer={props.layer}
        dataSourceId={dataSourceId}
        sourceColumns={props.sourceColumns}
        onLayerChange={props.onLayerChange}
      />
    </>
  );
}

function PointInputControls(
  props: Props & {
    binding: PointAggregationBinding;
    updatePoints: (points: MapLayer.PointBinding) => void;
  },
): ReactNode {
  const { t } = useLingui();
  const dataSourceId =
    props.layer.source.dataSource ?
      Model.getTypedId(props.layer.source.dataSource)
    : undefined;
  const { points } = props.binding;
  if (points.type === "geometryColumn") {
    return (
      <QueryColumnSingleSelect
        label={t`Point geometry column`}
        placeholder={t`Select a point geometry column`}
        dataSourceId={dataSourceId}
        value={_findColumn(props.layer, points.column)}
        onChange={(column) => {
          if (column) {
            props.updatePoints({ ...points, column: column.id });
          }
        }}
      />
    );
  }
  return (
    <>
      <PointCoordinateSelect {...props} axis="latitude" />
      <PointCoordinateSelect {...props} axis="longitude" />
    </>
  );
}

function PointCoordinateSelect(
  props: Props & {
    binding: PointAggregationBinding;
    updatePoints: (points: MapLayer.PointBinding) => void;
    axis: "latitude" | "longitude";
  },
): ReactNode {
  const { t } = useLingui();
  const points = props.binding.points;
  if (points.type !== "latLngColumns") {
    return null;
  }
  const dataSourceId =
    props.layer.source.dataSource ?
      Model.getTypedId(props.layer.source.dataSource)
    : undefined;
  const label = props.axis === "latitude" ? t`Latitude` : t`Longitude`;
  return (
    <QueryColumnSingleSelect
      label={label}
      placeholder={t`Select a column`}
      dataSourceId={dataSourceId}
      value={_findColumn(props.layer, points[props.axis])}
      onChange={(column) => {
        props.updatePoints({ ...points, [props.axis]: column?.id });
      }}
    />
  );
}

function PointBoundaryControls(
  props: Props & { binding: PointAggregationBinding },
): ReactNode {
  const { t } = useLingui();
  const selected = props.options.find(({ dataset }) => {
    return dataset.id === props.binding.boundary.datasetId;
  });
  const updateBoundary = (boundary: MapLayer.BoundarySource): void => {
    props.onLayerChange((current) => {
      return MapLayerUpdates.withPointAggregation(current, {
        points: props.binding.points,
        boundary,
        pointColumns: props.sourceColumns,
      });
    });
  };
  return (
    <>
      <Select
        label={t`Boundary dataset`}
        data={props.options.map(({ dataset, label }) => {
          return { value: dataset.id, label };
        })}
        value={props.binding.boundary.datasetId}
        allowDeselect={false}
        onChange={(datasetId) => {
          const option = props.options.find(({ dataset }) => {
            return dataset.id === datasetId;
          });
          const boundary =
            option ? _createBoundaryFromOption(option) : undefined;
          if (boundary) updateBoundary(boundary);
        }}
      />
      <BoundaryColumnControls
        binding={props.binding}
        columns={selected?.columns ?? []}
        updateBoundary={updateBoundary}
      />
    </>
  );
}

function BoundaryColumnControls(props: {
  binding: PointAggregationBinding;
  columns: readonly DatasetColumn.T[];
  updateBoundary: (boundary: MapLayer.BoundarySource) => void;
}): ReactNode {
  const { t } = useLingui();
  const data = props.columns.map((column) => {
    return { value: column.id, label: column.name };
  });
  const select = (
    label: string,
    field: "geometryColumnId" | "keyColumnId",
  ): ReactNode => {
    return (
      <Select
        label={label}
        data={data}
        value={props.binding.boundary[field]}
        allowDeselect={false}
        onChange={(value) => {
          if (value) {
            props.updateBoundary({
              ...props.binding.boundary,
              [field]: value as DatasetColumn.Id,
            });
          }
        }}
      />
    );
  };
  return (
    <>
      {select(t`Boundary geometry column`, "geometryColumnId")}
      {select(t`Boundary key column`, "keyColumnId")}
    </>
  );
}
