import { useLingui } from "@lingui/react/macro";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import { FilterSection } from "@/views/GisApp/panels/LayerInspector/FilterSection/FilterSection";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspector.module.css";
import { LayerLeadStatus } from "@/views/GisApp/panels/LayerInspector/LayerLeadStatus";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import { PopupSection } from "@/views/GisApp/panels/LayerInspector/PopupSection/PopupSection";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;
  onLayerChange: LayerChangeHandler;
  filterFocusRequest?: number;
};

/** Renders the selected layer's inspector sections. */
export function LayerInspectorBody(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, viewState, onLayerChange, filterFocusRequest } = props;
  if (!layer) {
    return (
      <div className={css.layerInspectorEmptyState}>
        {t`Select a layer to edit how it is queried and drawn.`}
      </div>
    );
  }
  return (
    <>
      <div className={css.layerInspectorLead}>
        <h3 className={css.layerInspectorLeadName}>{layer.name}</h3>
        <LayerLeadStatus viewState={viewState} />
      </div>
      <DataSection layer={layer} onLayerChange={onLayerChange} />
      <StyleSection layer={layer} onLayerChange={onLayerChange} />
      <SensitivitySection layer={layer} onLayerChange={onLayerChange} />
      <FilterSection
        layer={layer}
        onLayerChange={onLayerChange}
        focusRequest={filterFocusRequest}
      />
      <PopupSection layer={layer} onLayerChange={onLayerChange} />
      <LegendSection layer={layer} onLayerChange={onLayerChange} />
    </>
  );
}
