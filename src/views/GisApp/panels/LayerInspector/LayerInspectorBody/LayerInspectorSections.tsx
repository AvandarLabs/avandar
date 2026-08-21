import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import { FilterSection } from "@/views/GisApp/panels/LayerInspector/FilterSection/FilterSection";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody.module.css";
import { LayerLeadStatus } from "@/views/GisApp/panels/LayerInspector/LayerLeadStatus/LayerLeadStatus";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import { PopupSection } from "@/views/GisApp/panels/LayerInspector/PopupSection/PopupSection";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  layers?: readonly MapLayer.T[];
  viewState: MapLayerViewState | undefined;
  onLayerChange: LayerChangeHandler;
  filterFocusRequest?: number;
  onOpenMatchReport: () => void;
  onOpenClassification: () => void;
};

const EMPTY_LAYERS: readonly MapLayer.T[] = [];

/** Renders the inspector's stacked editing sections for a selected layer. */
export function LayerInspectorSections({
  layer,
  layers = EMPTY_LAYERS,
  viewState,
  onLayerChange,
  filterFocusRequest,
  onOpenMatchReport,
  onOpenClassification,
}: Props): ReactNode {
  return (
    <>
      <div className={css.layerInspectorBodyLead}>
        <h3 className={css.layerInspectorBodyLeadName}>{layer.name}</h3>
        <LayerLeadStatus
          viewState={viewState}
          onOpenMatchReport={onOpenMatchReport}
        />
      </div>
      <DataSection
        layer={layer}
        layers={layers}
        onLayerChange={onLayerChange}
      />
      <StyleSection
        layer={layer}
        onLayerChange={onLayerChange}
        onOpenClassification={onOpenClassification}
      />
      <SensitivitySection layer={layer} onLayerChange={onLayerChange} />
      <FilterSection
        layer={layer}
        onLayerChange={onLayerChange}
        focusRequest={filterFocusRequest}
        showApplyAoiFilterSwitch={layer.geoBinding?.type !== "bufferOfLayer"}
      />
      <PopupSection layer={layer} onLayerChange={onLayerChange} />
      <LegendSection layer={layer} onLayerChange={onLayerChange} />
    </>
  );
}
