import { useLingui } from "@lingui/react/macro";
import { Button, ColorInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { CircleRadiusControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/CircleRadiusControl";
import { ProportionalSymbolControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls";
import { StrokeControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/StrokeControls";
import { SymbologyTypeControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl/SymbologyTypeControl";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  onOpenClassification?: () => void;
};

/** Renders the controls for painting a map layer's geometry. */
export function StyleSection(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, onLayerChange } = props;
  const { symbology } = layer;
  const isPoint =
    symbology.type === "circle" || symbology.type === "proportionalSymbol";
  return (
    <InspectorSection title={t`Style`} defaultOpen>
      {isPoint ?
        <SymbologyTypeControl layer={layer} onLayerChange={onLayerChange} />
      : null}
      {symbology.color.type === "single" ?
        <ColorInput
          label={t`Color`}
          format="hex"
          value={symbology.color.color}
          onChange={(color) => {
            onLayerChange((current) => {
              return MapLayerUpdates.withSymbolColor({
                layer: current,
                color: color,
              });
            });
          }}
        />
      : null}
      {(
        props.onOpenClassification &&
        (symbology.type === "fill" ||
          symbology.type === "circle" ||
          symbology.type === "proportionalSymbol")
      ) ?
        <Button variant="subtle" onClick={props.onOpenClassification}>
          {t`Edit classification`}
        </Button>
      : null}
      {symbology.type === "circle" ?
        <CircleRadiusControl
          symbology={symbology}
          onLayerChange={onLayerChange}
        />
      : symbology.type === "proportionalSymbol" ?
        <ProportionalSymbolControls
          layer={
            { ...layer, symbology } as MapLayer.T & {
              symbology: typeof symbology;
            }
          }
          onLayerChange={onLayerChange}
        />
      : null}
      <StrokeControls stroke={symbology.stroke} onLayerChange={onLayerChange} />
    </InspectorSection>
  );
}
