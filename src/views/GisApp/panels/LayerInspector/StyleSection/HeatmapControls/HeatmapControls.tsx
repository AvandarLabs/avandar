import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { HeatmapRampSelect } from "@/views/GisApp/panels/LayerInspector/StyleSection/HeatmapControls/HeatmapRampSelect";
import { HeatmapWeightSelect } from "@/views/GisApp/panels/LayerInspector/StyleSection/HeatmapControls/HeatmapWeightSelect";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  symbology: MapLayer.HeatmapSymbology;
  onLayerChange: LayerChangeHandler;
};

/** Edits a heatmap's radius, optional weight, and sequential color ramp. */
export function HeatmapControls({
  layer,
  symbology,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const numericColumns = layer.source.queryColumns.filter(
    QueryColumn.isNumeric,
  );
  return (
    <>
      <NumberInput
        label={t`Heat radius`}
        suffix=" px"
        min={1}
        max={200}
        value={symbology.radiusPx}
        onChange={(value) => {
          if (!isNumber(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withHeatmapRadius({
              layer: current,
              radiusPx: value,
            });
          });
        }}
      />
      <HeatmapWeightSelect
        weight={symbology.weight}
        columns={numericColumns}
        onLayerChange={onLayerChange}
      />
      <HeatmapRampSelect ramp={symbology.ramp} onLayerChange={onLayerChange} />
    </>
  );
}
