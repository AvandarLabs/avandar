import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useBoundarySourceOptions } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Selects an optional numeric source denominator and per-unit multiplier. */
export function NormalizationControls(props: Props): ReactNode {
  const { t } = useLingui();
  const { symbology } = props.layer;
  const boundarySources = useBoundarySourceOptions(
    props.layer.source.dataSource?.workspaceId,
  );
  if (symbology.type === "heatmap" || symbology.color.type !== "graduated") {
    return null;
  }
  const color = symbology.color;
  const columns = props.layer.source.queryColumns.filter(QueryColumn.isNumeric);
  const binding = props.layer.geoBinding;
  const boundaryDatasetId =
    (
      binding?.type === "joinToBoundaries" ||
      binding?.type === "aggregatePointsToBoundaries"
    ) ?
      binding.boundary.datasetId
    : undefined;
  const boundaryColumns =
    boundarySources.options
      .find(({ dataset }) => {
        return dataset.id === boundaryDatasetId;
      })
      ?.columns.filter((column) => {
        return AvaDataType.isNumeric(column.dataType);
      }) ?? [];
  const denominator = color.normalization?.denominator;
  const setNormalization = (selection: string | null): void => {
    props.onLayerChange((current) => {
      if (current.symbology.type === "heatmap") {
        return current;
      }
      const currentColor = current.symbology.color;
      if (currentColor.type !== "graduated") {
        return current;
      }
      return MapLayerUpdates.withLayerColor(current, {
        ...currentColor,
        normalization:
          selection ?
            {
              denominator:
                selection.startsWith("boundary:") ?
                  {
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
      });
    });
  };
  return (
    <>
      <Select
        label={t`Normalize by`}
        clearable
        data={columns
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
                label: t`${column.name} (boundary)`,
              };
            }),
          )}
        value={
          denominator ?
            `${denominator.type === "queryColumn" ? "query" : "boundary"}:${denominator.column}`
          : null
        }
        onChange={setNormalization}
      />
      {color.normalization ?
        <Select
          label={t`Per`}
          data={[
            { value: "1", label: t`1` },
            { value: "1000", label: t`1,000` },
            { value: "100000", label: t`100,000` },
          ]}
          value={String(color.normalization.multiplier)}
          allowDeselect={false}
          onChange={(value) => {
            if (!value) {
              return;
            }
            props.onLayerChange((current) => {
              if (current.symbology.type === "heatmap") {
                return current;
              }
              const currentColor = current.symbology.color;
              if (
                currentColor.type !== "graduated" ||
                !currentColor.normalization
              ) {
                return current;
              }
              return MapLayerUpdates.withLayerColor(current, {
                ...currentColor,
                normalization: {
                  ...currentColor.normalization,
                  multiplier: Number(value) as 1 | 1_000 | 100_000,
                },
              });
            });
          }}
        />
      : null}
    </>
  );
}
