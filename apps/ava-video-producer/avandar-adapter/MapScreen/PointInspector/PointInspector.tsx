import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import inspectorCss from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody.module.css";
import { LayerLeadStatus } from "@/views/GisApp/panels/LayerInspector/LayerLeadStatus/LayerLeadStatus";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import { viewStates } from "../mapFixtures";
import { PointDataSection } from "./PointDataSection";
import { PointStyleSection } from "./PointStyleSection";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  frame: number;
};

const _noop = () => {
  return undefined;
};

/**
 * The real layer inspector panel: product data/style/sensitivity sections over
 * an immutable fixture layer.
 */
export function PointInspector({ layer, frame }: Readonly<Props>): ReactNode {
  const isDataOpen = frame < 208;
  const symbology = layer.symbology as Extract<
    MapLayer.Symbology,
    { type: "circle" }
  >;
  // DataSection's actual control ordering and Mantine controls. Its data
  // clients are replaced by immutable CSV columns at this adapter boundary.
  return (
    <MapChromePanel
      variant="inspector"
      id="gis-inspector"
      title="Layer"
      isCollapsed={false}
      onToggleCollapsed={_noop}
      collapseLabel="Collapse the layer panel"
      expandLabel="Expand the layer panel"
    >
      <div className={inspectorCss.layerInspectorBodyLead}>
        <h3 className={inspectorCss.layerInspectorBodyLeadName}>
          {layer.name}
        </h3>
        <LayerLeadStatus viewState={viewStates.get(layer.id)} />
      </div>
      <PointDataSection layer={layer} isDataOpen={isDataOpen} />
      <PointStyleSection symbology={symbology} />
      <SensitivitySection layer={layer} onLayerChange={_noop} />
      <InspectorSection title="Filter">
        <span />
      </InspectorSection>
      <InspectorSection title="Popup" note="All fields">
        <span />
      </InspectorSection>
      <LegendSection layer={layer} onLayerChange={_noop} />
    </MapChromePanel>
  );
}
