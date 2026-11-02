import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { NormalizationMultiplierSelect } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/NormalizationControls/NormalizationMultiplierSelect";
import { useBoundarySourceOptions } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };
type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

function _getBoundaryDatasetId(
  binding: MapLayer.GeoBinding | undefined,
): string | undefined {
  if (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries"
  ) {
    return binding.boundary.datasetId;
  }
  return undefined;
}

function _getNumericBoundaryColumns(
  options: ReadonlyArray<{
    dataset: { id: string };
    columns: readonly DatasetColumn.T[];
  }>,
  boundaryDatasetId: string | undefined,
): DatasetColumn.T[] {
  return (
    options
      .find(({ dataset }) => {
        return dataset.id === boundaryDatasetId;
      })
      ?.columns.filter((column) => {
        return AvaDataType.isNumeric(column.dataType);
      }) ?? []
  );
}

function _getNormalizationSelectData(options: {
  columns: readonly QueryColumn.T[];
  boundaryColumns: readonly DatasetColumn.T[];
  i18n: I18n;
}): Array<{ value: string; label: string }> {
  const { columns, boundaryColumns, i18n } = options;
  return columns
    .map((column) => {
      return {
        value: `query:${column.id}`,
        label: QueryColumn.getDerivedColumnName(column),
      };
    })
    .concat(
      boundaryColumns.map((column) => {
        return {
          value: `boundary:${column.id}`,
          label: i18n._(msg`${column.name} (boundary)`),
        };
      }),
    );
}

function _applyNormalizationSelection(options: {
  selection: string | null;
  onLayerChange: LayerChangeHandler;
}): void {
  const { selection, onLayerChange } = options;
  onLayerChange((current) => {
    if (current.symbology.type === "heatmap") {
      return current;
    }
    const currentColor = current.symbology.color;
    if (currentColor.type !== "graduated") {
      return current;
    }
    return MapLayerUpdates.withLayerColor({
      layer: current,
      color: {
        ...currentColor,
        normalization: selection
          ? {
              denominator: selection.startsWith("boundary:")
                ? {
                    type: "boundaryColumn",
                    column: selection.slice(9) as DatasetColumn.Id,
                  }
                : {
                    type: "queryColumn",
                    column: selection.slice(6) as QueryColumn.Id,
                  },
              multiplier: currentColor.normalization?.multiplier ?? 1_000,
            }
          : undefined,
      },
    });
  });
}

function _getNormalizationValue(color: GraduatedColor): string | null {
  const denominator = color.normalization?.denominator;
  if (!denominator) {
    return null;
  }
  const prefix = denominator.type === "queryColumn" ? "query" : "boundary";
  return `${prefix}:${denominator.column}`;
}

/** Selects an optional numeric source denominator and per-unit multiplier. */
export function NormalizationControls({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t, i18n } = useLingui();
  const { symbology } = layer;
  const boundarySources = useBoundarySourceOptions(
    layer.source.dataSource?.workspaceId,
  );
  if (symbology.type === "heatmap" || symbology.color.type !== "graduated") {
    return null;
  }
  const color = symbology.color;
  const columns = layer.source.queryColumns.filter(QueryColumn.isNumeric);
  const boundaryColumns = _getNumericBoundaryColumns(
    boundarySources.options,
    _getBoundaryDatasetId(layer.geoBinding),
  );
  return (
    <>
      <Select
        label={t`Normalize by`}
        clearable
        data={_getNormalizationSelectData({ columns, boundaryColumns, i18n })}
        value={_getNormalizationValue(color)}
        onChange={(selection) => {
          _applyNormalizationSelection({ selection, onLayerChange });
        }}
      />
      {color.normalization ? (
        <NormalizationMultiplierSelect
          multiplier={color.normalization.multiplier}
          onLayerChange={onLayerChange}
        />
      ) : null}
    </>
  );
}
