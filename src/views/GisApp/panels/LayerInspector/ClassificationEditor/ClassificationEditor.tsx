import { CategoricalControls } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/CategoricalControls";
import { ClassificationColorModeSelect } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationColorModeSelect";
import css from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditor.module.css";
import { ClassificationEditorHeader } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationEditorHeader";
import { ClassificationHistogram } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationHistogram/ClassificationHistogram";
import { GraduatedControls } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedControls";
import { NoDataControls } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/NoDataControls";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  onBack: () => void;
};

function _getManualBreaks(layer: MapLayer.T, color: MapLayer.Color): number[] {
  if (color.type === "graduated" && color.classification.method === "manual") {
    return [...color.classification.breaks];
  }
  return layer.legend.breaks
    .map(({ upper }) => {
      return upper;
    })
    .filter((value): value is number => {
      return value !== undefined;
    });
}

/** Focused editor for polygon color classification and normalization. */
export function ClassificationEditor({
  layer,
  onLayerChange,
  onBack,
}: Props): ReactNode {
  const { symbology } = layer;
  if (symbology.type === "heatmap") {
    return null;
  }
  const { color } = symbology;
  return (
    <div className={css.classificationEditor}>
      <ClassificationEditorHeader onBack={onBack} />
      <ClassificationColorModeSelect
        layer={layer}
        colorType={color.type}
        onLayerChange={onLayerChange}
      />
      {color.type === "graduated" ? (
        <GraduatedControls
          layer={layer}
          color={color}
          manualBreaks={_getManualBreaks(layer, color)}
          onLayerChange={onLayerChange}
        />
      ) : color.type === "categorical" ? (
        <CategoricalControls layer={layer} onLayerChange={onLayerChange} />
      ) : null}
      <NoDataControls layer={layer} onLayerChange={onLayerChange} />
      <ClassificationHistogram entries={layer.legend.entries} />
    </div>
  );
}
