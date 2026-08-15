import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import css from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.module.css";
import { SymbologyOptions } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions";
import { useSymbologyTypeChange } from "@/views/GisApp/panels/LayerInspector/StyleSection/useSymbologyTypeChange";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Selects the layer's symbol type while retaining each type's settings. */
export function SymbologyTypeControl(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, onLayerChange } = props;
  const onTypeChange = useSymbologyTypeChange(layer, onLayerChange);
  const labels = {
    circle: t`Point`,
    proportionalSymbol: t`Sized`,
    cluster: t`Cluster`,
    heatmap: t`Heat`,
  };
  return (
    <div>
      <Text component="span" size="xs" fw={500} id="gis-symbology-label">
        {t`Symbol`}
      </Text>
      <div
        className={css.styleSectionSegmented}
        role="group"
        aria-labelledby="gis-symbology-label"
      >
        <SymbologyOptions
          activeType={layer.symbology.type}
          labels={labels}
          onTypeChange={onTypeChange}
        />
      </div>
      <Text component="p" size="xs" c="dimmed" id="gis-symbology-hint">
        {t`Cluster and Heat are unavailable: they arrive in a later release.`}
      </Text>
    </div>
  );
}
