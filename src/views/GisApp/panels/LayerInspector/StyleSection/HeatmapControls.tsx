import { Model } from "@avandar/models";
import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput, Select } from "@mantine/core";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

const HEATMAP_RAMPS = {
  ochre: MapLayer.defaultHeatmapRamp,
  blue: ["#eff3ff", "#bdd7e7", "#6baed6", "#2171b5", "#08306b"],
  orange: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
} as const;

type Props = {
  layer: MapLayer.T & { symbology: MapLayer.HeatmapSymbology };
  onLayerChange: LayerChangeHandler;
};

function _getRampName(ramp: readonly string[]): keyof typeof HEATMAP_RAMPS {
  if (ramp[0] === HEATMAP_RAMPS.blue[0]) {
    return "blue";
  }
  if (ramp[0] === HEATMAP_RAMPS.orange[0]) {
    return "orange";
  }
  return "ochre";
}

/** Edits a heatmap's radius, optional weight, and sequential color ramp. */
export function HeatmapControls({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId =
    layer.source.dataSource ?
      Model.getTypedId(layer.source.dataSource)
    : undefined;
  return (
    <>
      <NumberInput
        label={t`Heat radius`}
        suffix=" px"
        min={1}
        max={200}
        value={layer.symbology.radiusPx}
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
      <QueryColumnSingleSelect
        label={t`Weight by`}
        placeholder={t`Unweighted`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.getQueryColumnFromLayer({
            layer,
            columnId: layer.symbology.weight,
          }) ?? null
        }
        onChange={(column) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withHeatmapWeight({
              layer: current,
              column: column ?? undefined,
            });
          });
        }}
      />
      <Select
        label={t`Color ramp`}
        data={[
          { value: "ochre", label: t`Ochre` },
          { value: "blue", label: t`Blue` },
          { value: "orange", label: t`Orange` },
        ]}
        value={_getRampName(layer.symbology.ramp)}
        allowDeselect={false}
        onChange={(rampName) => {
          if (
            rampName !== "ochre" &&
            rampName !== "blue" &&
            rampName !== "orange"
          ) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withHeatmapRamp({
              layer: current,
              ramp: HEATMAP_RAMPS[rampName],
            });
          });
        }}
      />
    </>
  );
}
