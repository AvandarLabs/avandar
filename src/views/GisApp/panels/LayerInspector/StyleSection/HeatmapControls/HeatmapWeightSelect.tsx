import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  weight: MapLayer.HeatmapSymbology["weight"];
  columns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

/** Selects an optional numeric column used to weight heatmap intensity. */
export function HeatmapWeightSelect({
  weight,
  columns,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Weight by`}
      placeholder={t`Unweighted`}
      clearable
      data={columns.map((column) => {
        return {
          value: column.id,
          label: QueryColumn.getDerivedColumnName(column),
        };
      })}
      value={weight ?? null}
      onChange={(columnId) => {
        const column = columns.find(({ id }) => {
          return id === columnId;
        });
        onLayerChange((current) => {
          return MapLayerUpdates.withHeatmapWeight({
            layer: current,
            column,
          });
        });
      }}
    />
  );
}
