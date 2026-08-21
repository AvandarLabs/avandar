import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AreaAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AreaAggregationControls";
import { GridShapeControl } from "@/views/GisApp/panels/LayerInspector/DataSection/GridBinControls/GridShapeControl";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

/** Edits grid shape, fixed meter size, and cell aggregation. */
export function GridBinControls({
  layer,
  sourceColumns,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const binding = layer.geoBinding;
  if (binding?.type !== "binPointsToGrid") {
    return null;
  }
  return (
    <>
      <GridShapeControl grid={binding.grid} onLayerChange={onLayerChange} />
      <NumberInput
        label={t`Cell size (meters)`}
        value={binding.sizeMeters}
        min={100}
        max={1_000_000}
        clampBehavior="blur"
        allowDecimal={false}
        onChange={(sizeMeters) => {
          if (typeof sizeMeters !== "number") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withGridSizeMeters({
              layer: current,
              sizeMeters,
            });
          });
        }}
      />
      <AreaAggregationControls
        layer={layer}
        dataSourceId={
          layer.source.dataSource ?
            Model.getTypedId(layer.source.dataSource)
          : undefined
        }
        sourceColumns={sourceColumns}
        onLayerChange={onLayerChange}
      />
    </>
  );
}
