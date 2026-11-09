import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { withQueryColumn } from "@/views/GisApp/layers/MapLayerUpdates/withQueryColumn";
import { getNumericLayerColumns } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/getNumericLayerColumns";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

type Props = {
  layer: MapLayer.T;
  color: GraduatedColor;
  onLayerChange: LayerChangeHandler;
};

function _withMeasureColumn(options: {
  layer: MapLayer.T;
  column: QueryColumn.T;
}): MapLayer.T {
  const { column } = options;
  const layer = withQueryColumn(options);
  if (
    layer.symbology.type === "heatmap" ||
    layer.symbology.color.type !== "graduated"
  ) {
    return layer;
  }
  return MapLayerUpdates.withLayerColor({
    layer,
    color: {
      ...layer.symbology.color,
      value: { type: "queryColumn", column: column.id },
    },
  });
}

function _applyMeasure(options: {
  layer: MapLayer.T;
  columnId: string;
  onLayerChange: LayerChangeHandler;
}): void {
  const column = getNumericLayerColumns(options.layer).find((candidate) => {
    return candidate.id === options.columnId;
  });
  if (!column) {
    return;
  }
  options.onLayerChange((current) => {
    return _withMeasureColumn({ layer: current, column });
  });
}

/** Picks which numeric field graduated color classifies. */
export function GraduatedMeasureSelect({
  layer,
  color,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  if (color.value.type !== "queryColumn") {
    return null;
  }
  const columns = getNumericLayerColumns(layer);
  if (columns.length === 0) {
    return null;
  }
  return (
    <Select
      label={t`Measure`}
      data={columns.map((column) => {
        return {
          value: column.id,
          label: QueryColumn.getDerivedColumnName(column),
        };
      })}
      value={color.value.column}
      allowDeselect={false}
      onChange={(columnId) => {
        if (columnId) {
          _applyMeasure({ layer, columnId, onLayerChange });
        }
      }}
    />
  );
}
