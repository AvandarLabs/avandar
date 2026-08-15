import { useLingui } from "@lingui/react/macro";
import { ClassificationEditor } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor";
import { DataSection } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSection";
import { FilterSection } from "@/views/GisApp/panels/LayerInspector/FilterSection/FilterSection";
import css from "@/views/GisApp/panels/LayerInspector/LayerInspectorBody/LayerInspectorBody.module.css";
import { LayerLeadStatus } from "@/views/GisApp/panels/LayerInspector/LayerLeadStatus/LayerLeadStatus";
import { LegendSection } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendSection";
import { MatchReport } from "@/views/GisApp/panels/LayerInspector/MatchReport/MatchReport";
import { PopupSection } from "@/views/GisApp/panels/LayerInspector/PopupSection/PopupSection";
import { SensitivitySection } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivitySection";
import { StyleSection } from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type {
  LayerChangeHandler,
  LayerInspectorView,
} from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T | undefined;
  viewState: MapLayerViewState | undefined;
  onLayerChange: LayerChangeHandler;
  filterFocusRequest?: number;
  inspectorView: LayerInspectorView;
  onOpenMatchReport: () => void;
  onOpenClassification: () => void;
  onCloseMatchReport: () => void;
};

/** Renders the selected layer's inspector sections. */
export function LayerInspectorBody({
  layer,
  viewState,
  onLayerChange,
  filterFocusRequest,
  inspectorView,
  onOpenMatchReport,
  onOpenClassification,
  onCloseMatchReport,
}: Props): ReactNode {
  const { t } = useLingui();
  if (!layer) {
    return (
      <div className={css.layerInspectorBodyEmptyState}>
        {t`Select a layer to edit how it is queried and drawn.`}
      </div>
    );
  }
  if (inspectorView.type === "matchReport" && viewState?.spatialDiagnostics) {
    return (
      <MatchReport
        diagnostics={viewState.spatialDiagnostics}
        onBack={onCloseMatchReport}
      />
    );
  }
  if (inspectorView.type === "classification") {
    return (
      <ClassificationEditor
        layer={layer}
        onLayerChange={onLayerChange}
        onBack={onCloseMatchReport}
      />
    );
  }
  return (
    <>
      <div className={css.layerInspectorBodyLead}>
        <h3 className={css.layerInspectorBodyLeadName}>{layer.name}</h3>
        <LayerLeadStatus
          viewState={viewState}
          onOpenMatchReport={onOpenMatchReport}
        />
      </div>
      <DataSection layer={layer} onLayerChange={onLayerChange} />
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
      />
      <PopupSection layer={layer} onLayerChange={onLayerChange} />
      <LegendSection layer={layer} onLayerChange={onLayerChange} />
    </>
  );
}
