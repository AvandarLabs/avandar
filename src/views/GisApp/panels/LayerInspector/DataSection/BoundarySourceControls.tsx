import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { BoundarySourceOption } from "./useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  options: readonly BoundarySourceOption[];
  dataKeyColumn: QueryColumn.T;
  onLayerChange: LayerChangeHandler;
};

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

/** Edits the columns in a stable boundary-source reference. */
export function BoundarySourceControls(props: Props): ReactNode {
  const { t } = useLingui();
  const binding = props.layer.geoBinding;
  if (binding?.type !== "joinToBoundaries") {
    return null;
  }
  const selected = props.options.find(({ dataset }) => {
    return dataset.id === binding.boundary.datasetId;
  });
  const columnData = (selected?.columns ?? []).map((column) => {
    return { value: column.id, label: column.name };
  });
  const updateColumn = (
    field: "geometryColumnId" | "keyColumnId" | "displayNameColumnId",
    columnId: DatasetColumn.Id | undefined,
  ) => {
    props.onLayerChange((current) => {
      return MapLayerUpdates.withBoundaryJoin(current, {
        dataKeyColumn: props.dataKeyColumn,
        matching: binding.matching,
        boundary: { ...binding.boundary, [field]: columnId },
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
        value={binding.boundary.datasetId}
        allowDeselect={false}
        onChange={(datasetId) => {
          const option = props.options.find(({ dataset }) => {
            return dataset.id === datasetId;
          });
          const boundary = option ? _createBoundaryFromOption(option) : null;
          if (!boundary) {
            return;
          }
          props.onLayerChange((current) => {
            return MapLayerUpdates.withBoundaryJoin(current, {
              dataKeyColumn: props.dataKeyColumn,
              matching: binding.matching,
              boundary,
            });
          });
        }}
      />
      <BoundaryColumnSelect
        label={t`Boundary geometry column`}
        data={columnData}
        value={binding.boundary.geometryColumnId}
        onChange={(value) => {
          updateColumn("geometryColumnId", value);
        }}
      />
      <BoundaryColumnSelect
        label={t`Boundary key column`}
        data={columnData}
        value={binding.boundary.keyColumnId}
        onChange={(value) => {
          updateColumn("keyColumnId", value);
        }}
      />
      <Select
        label={t`Boundary display name`}
        data={columnData}
        value={binding.boundary.displayNameColumnId ?? null}
        clearable
        onChange={(value) => {
          updateColumn(
            "displayNameColumnId",
            value ? (value as DatasetColumn.Id) : undefined,
          );
        }}
      />
    </>
  );
}

function BoundaryColumnSelect(props: {
  label: string;
  data: Array<{ value: DatasetColumn.Id; label: string }>;
  value: DatasetColumn.Id;
  onChange: (value: DatasetColumn.Id) => void;
}): ReactNode {
  return (
    <Select
      label={props.label}
      data={props.data}
      value={props.value}
      allowDeselect={false}
      onChange={(value) => {
        if (value) {
          props.onChange(value as DatasetColumn.Id);
        }
      }}
    />
  );
}
