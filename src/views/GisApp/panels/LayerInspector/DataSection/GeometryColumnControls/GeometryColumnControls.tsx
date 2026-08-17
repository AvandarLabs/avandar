import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { CrsOverrideField } from "@/views/GisApp/panels/LayerInspector/DataSection/CrsOverrideField/CrsOverrideField";
import { GeometryEncodingSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls/GeometryEncodingSelect";
import { GeometryFamilySelect } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls/GeometryFamilySelect";
import { GeometrySourceColumnSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls/GeometrySourceColumnSelect";
import { SimplificationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/SimplificationControls";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits a direct geometry-column binding without constructing SQL. */
export function GeometryColumnControls({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const binding = layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    return null;
  }
  return (
    <>
      <GeometrySourceColumnSelect
        layer={layer}
        columnId={binding.column}
        onLayerChange={onLayerChange}
      />
      <GeometryEncodingSelect
        encoding={binding.encoding}
        onLayerChange={onLayerChange}
      />
      <GeometryFamilySelect
        family={binding.family}
        isAggregateOnly={layer.sensitivity.mode === "aggregateOnly"}
        onLayerChange={onLayerChange}
      />
      <CrsOverrideField
        sourceCrs={binding.sourceCrs}
        onChange={(sourceCrs) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withGeometrySourceCrs({
              layer: current,
              sourceCrs,
            });
          });
        }}
      />
      <SimplificationControls
        binding={binding}
        onLayerChange={onLayerChange}
      />
    </>
  );
}
