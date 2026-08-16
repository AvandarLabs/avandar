import { Model } from "@avandar/models";
import { Callout } from "@avandar/ui";
import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput, Select } from "@mantine/core";
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

/** Edits the value column, radius range, and scale for sized symbols. */
export function ProportionalSymbolControls({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
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
          MapLayerUpdates.getQueryColumnFromLayer({
            layer: layer,
            columnId: layer.symbology.value,
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
      <NumberInput
        label={t`Smallest radius`}
        suffix=" px"
        min={2}
        max={80}
        value={layer.symbology.minRadius}
        onChange={(value) => {
          if (!isNumber(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withMinSymbolRadius({
              layer: current,
              minRadius: value,
            });
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
          if (!isNumber(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withMaxSymbolRadius({
              layer: current,
              maxRadius: value,
            });
          });
        }}
      />
      <Select
        label={t`Scale`}
        data={[
          { value: "sqrt", label: t`Square root` },
          { value: "linear", label: t`Linear` },
        ]}
        value={layer.symbology.scale}
        allowDeselect={false}
        onChange={(scale) => {
          if (scale !== "sqrt" && scale !== "linear") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolScale({
              layer: current,
              scale,
            });
          });
        }}
      />
      {layer.symbology.scale === "sqrt" ?
        <Callout>
          {t`Symbol area is proportional to the value, not radius, so a value ten times larger draws a symbol about three times wider.`}
        </Callout>
      : null}
    </>
  );
}
