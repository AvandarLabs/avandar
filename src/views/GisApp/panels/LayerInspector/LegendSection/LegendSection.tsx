import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { LegendNoDataSwitch } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendNoDataSwitch";
import { LegendPositionSelect } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendPositionSelect";
import { LegendTextControls } from "@/views/GisApp/panels/LayerInspector/LegendSection/LegendTextControls";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits a layer's legend content and position. */
export function LegendSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const positionLabel = matchLiteral(layer.legend.position, {
    bottomLeft: t`Bottom left`,
    bottomRight: t`Bottom right`,
    topRight: t`Top right`,
    hidden: t`Hidden`,
  });
  return (
    <InspectorSection title={t`Legend`} note={positionLabel}>
      <LegendTextControls legend={layer.legend} onLayerChange={onLayerChange} />
      <LegendPositionSelect
        legend={layer.legend}
        onLayerChange={onLayerChange}
      />
      <LegendNoDataSwitch legend={layer.legend} onLayerChange={onLayerChange} />
    </InspectorSection>
  );
}
