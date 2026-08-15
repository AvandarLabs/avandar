import { Model } from "@avandar/models";
import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T & {
    symbology: Extract<MapLayer.Symbology, { type: "proportionalSymbol" }>;
  };
  onLayerChange: LayerChangeHandler;
};

/** Edits the value column and largest radius for sized symbols. */
export function ProportionalSymbolControls(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, onLayerChange } = props;
  const dataSourceId =
    layer.source.dataSource ?
      Model.getTypedId(layer.source.dataSource)
    : undefined;
  return (
    <>
      <QueryColumnSingleSelect
        label={t`Size by`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.findQueryColumn(layer, layer.symbology.value) ?? null
        }
        onChange={(column) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolSizeColumn(
              current,
              column ?? undefined,
            );
          });
        }}
      />
      <NumberInput
        label={t`Largest radius`}
        suffix=" px"
        min={2}
        max={80}
        value={layer.symbology.maxRadius}
        onChange={(value) => {
          if (typeof value !== "number") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withMaxSymbolRadius(current, value);
          });
        }}
      />
      <Callout>
        {t`Symbol area is proportional to the value, not radius, so a value ten times larger draws a symbol about three times wider.`}
      </Callout>
    </>
  );
}
