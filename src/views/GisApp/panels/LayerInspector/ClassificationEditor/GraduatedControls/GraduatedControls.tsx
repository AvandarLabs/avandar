import { useLingui } from "@lingui/react/macro";
import { ClassificationBreakHandles } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/ClassificationBreakHandles/ClassificationBreakHandles";
import { GraduatedMethodControls } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedMethodControls";
import { GraduatedRampSelect } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedRampSelect";
import { NormalizationControls } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/NormalizationControls/NormalizationControls";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type GraduatedColor = Extract<MapLayer.Color, { type: "graduated" }>;

type Props = {
  layer: MapLayer.T;
  color: GraduatedColor;
  manualBreaks: readonly number[];
  onLayerChange: LayerChangeHandler;
};

function _getClassCount(color: GraduatedColor): number {
  return color.classification.method === "manual" ?
      color.classification.breaks.length + 1
    : color.classification.classCount;
}

/** Edits automatic or manual graduated color classification. */
export function GraduatedControls({
  layer,
  color,
  manualBreaks,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const classifiedCount = layer.legend.entries.reduce((sum, entry) => {
    return sum + entry.count;
  }, 0);
  return (
    <>
      <GraduatedMethodControls
        layer={layer}
        color={color}
        classCount={_getClassCount(color)}
        manualBreaks={manualBreaks}
        onLayerChange={onLayerChange}
      />
      <GraduatedRampSelect color={color} onLayerChange={onLayerChange} />
      <NormalizationControls layer={layer} onLayerChange={onLayerChange} />
      <ClassificationBreakHandles
        layer={layer}
        breaks={manualBreaks}
        onLayerChange={onLayerChange}
      />
      {color.classification.method === "jenks" && classifiedCount > 5_000 ?
        <p>{t`Natural breaks used an evenly ranked sample of 5,000 values.`}</p>
      : null}
    </>
  );
}
