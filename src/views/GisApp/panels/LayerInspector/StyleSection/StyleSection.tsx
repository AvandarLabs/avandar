import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Button, ColorInput } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { CircleRadiusControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/CircleRadiusControl";
import { ClusterControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/ClusterControls";
import { HeatmapControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/HeatmapControls/HeatmapControls";
import { ProportionalSymbolControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls/ProportionalSymbolControls";
import { StrokeControls } from "@/views/GisApp/panels/LayerInspector/StyleSection/StrokeControls";
import { SymbologyTypeControl } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl/SymbologyTypeControl";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  onOpenClassification?: () => void;
};

function _isPointSymbology(symbology: MapLayer.Symbology): boolean {
  return (
    symbology.type === "circle" ||
    symbology.type === "proportionalSymbol" ||
    symbology.type === "cluster" ||
    symbology.type === "heatmap" ||
    symbology.type === "fill"
  );
}

function _canClassify(symbology: MapLayer.Symbology): boolean {
  return (
    symbology.type === "fill" ||
    symbology.type === "circle" ||
    symbology.type === "proportionalSymbol"
  );
}

function _getStyleTypeControls(options: {
  layer: MapLayer.T;
  symbology: MapLayer.Symbology;
  onLayerChange: LayerChangeHandler;
}): ReactNode {
  const { layer, symbology, onLayerChange } = options;
  if (symbology.type === "circle") {
    return (
      <CircleRadiusControl
        symbology={symbology}
        onLayerChange={onLayerChange}
      />
    );
  }
  if (symbology.type === "proportionalSymbol") {
    return (
      <ProportionalSymbolControls
        layer={layer}
        symbology={symbology}
        onLayerChange={onLayerChange}
      />
    );
  }
  if (symbology.type === "cluster") {
    return (
      <ClusterControls symbology={symbology} onLayerChange={onLayerChange} />
    );
  }
  if (symbology.type === "heatmap") {
    return (
      <HeatmapControls
        layer={layer}
        symbology={symbology}
        onLayerChange={onLayerChange}
      />
    );
  }
  return null;
}

/** Renders the controls for painting a map layer's geometry. */
export function StyleSection({
  layer,
  onLayerChange,
  onOpenClassification,
}: Props): ReactNode {
  const { t } = useLingui();
  const { symbology } = layer;
  return (
    <InspectorSection title={t`Style`} defaultOpen>
      {_isPointSymbology(symbology) ? (
        <SymbologyTypeControl layer={layer} onLayerChange={onLayerChange} />
      ) : null}
      {symbology.type !== "heatmap" && symbology.color.type === "single" ? (
        <ColorInput
          label={t`Color`}
          format="hex"
          value={symbology.color.color}
          onChange={(color) => {
            onLayerChange((current) => {
              return MapLayerUpdates.withSymbolColor({
                layer: current,
                color,
              });
            });
          }}
        />
      ) : null}
      {onOpenClassification && _canClassify(symbology) ? (
        <Button variant="subtle" onClick={onOpenClassification}>
          {t`Edit classification`}
        </Button>
      ) : null}
      {_getStyleTypeControls({ layer, symbology, onLayerChange })}
      {symbology.type !== "heatmap" ? (
        <StrokeControls
          stroke={symbology.stroke}
          onLayerChange={onLayerChange}
        />
      ) : null}
    </InspectorSection>
  );
}
