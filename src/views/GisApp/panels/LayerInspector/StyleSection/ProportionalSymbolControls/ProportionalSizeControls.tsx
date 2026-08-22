import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { ProportionalRadiusInput } from "@/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls/ProportionalRadiusInput";
import { ProportionalScaleSelect } from "@/views/GisApp/panels/LayerInspector/StyleSection/ProportionalSymbolControls/ProportionalScaleSelect";

type Props = {
  minRadius: number;
  maxRadius: number;
  scale: "sqrt" | "linear";
  onLayerChange: LayerChangeHandler;
};

/** Edits the radius range and area-vs-linear scale for sized symbols. */
export function ProportionalSizeControls({
  minRadius,
  maxRadius,
  scale,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <ProportionalRadiusInput
        label={t`Smallest radius`}
        value={minRadius}
        onLayerChange={onLayerChange}
        apply={(current, nextMinRadius) => {
          return MapLayerUpdates.withMinSymbolRadius({
            layer: current,
            minRadius: nextMinRadius,
          });
        }}
      />
      <ProportionalRadiusInput
        label={t`Largest radius`}
        value={maxRadius}
        onLayerChange={onLayerChange}
        apply={(current, nextMaxRadius) => {
          return MapLayerUpdates.withMaxSymbolRadius({
            layer: current,
            maxRadius: nextMaxRadius,
          });
        }}
      />
      <ProportionalScaleSelect scale={scale} onLayerChange={onLayerChange} />
    </>
  );
}
