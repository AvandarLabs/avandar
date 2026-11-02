import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { ProportionalSizeControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls/ProportionalSizeControls";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  symbology: Extract<MapLayer.Symbology, { type: "proportionalSymbol" }>;
  onLayerChange: LayerChangeHandler;
};

/** Edits the value column, radius range, and scale for sized symbols. */
export function ProportionalSymbolControls({
  layer,
  symbology,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  return (
    <>
      <QueryColumnSingleSelect
        label={t`Size by`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.getQueryColumnFromLayer({
            layer,
            columnId: symbology.value,
          }) ?? null
        }
        onChange={(column) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolSizeColumn({
              layer: current,
              column: column ?? undefined,
            });
          });
        }}
      />
      <ProportionalSizeControls
        minRadius={symbology.minRadius}
        maxRadius={symbology.maxRadius}
        scale={symbology.scale}
        onLayerChange={onLayerChange}
      />
    </>
  );
}
