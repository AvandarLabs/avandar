import { useLingui } from "@lingui/react/macro";
import { ColorInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { CircleRadiusControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/CircleRadiusControl";
import { ProportionalSymbolControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls";
import { StrokeControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/StrokeControls";
import { SymbologyTypeControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Renders the controls for painting a map layer's geometry. */
export function StyleSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const { symbology } = layer;
  return (
    <InspectorSection title={t`Style`} defaultOpen>
      <SymbologyTypeControl layer={layer} onLayerChange={onLayerChange} />
      <ColorInput
        label={t`Color`}
        format="hex"
        value={symbology.color.color}
        onChange={(color) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withSymbolColor(current, color);
          });
        }}
      />
      {symbology.type === "circle" ?
        <CircleRadiusControl
          symbology={symbology}
          onLayerChange={onLayerChange}
        />
      : <ProportionalSymbolControls
          layer={{ ...layer, symbology }}
          onLayerChange={onLayerChange}
        />
      }
      <StrokeControls stroke={symbology.stroke} onLayerChange={onLayerChange} />
    </InspectorSection>
  );
}
