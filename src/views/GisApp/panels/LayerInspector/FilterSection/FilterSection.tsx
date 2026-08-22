import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { ApplyAoiFilterSwitch } from "@/views/GisApp/panels/LayerInspector/FilterSection/ApplyAoiFilterSwitch";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  focusRequest?: number;
  showApplyAoiFilterSwitch?: boolean;
};

/** Renders the source filter tree and its top-level rule count. */
export function FilterSection({
  layer,
  onLayerChange,
  focusRequest,
  showApplyAoiFilterSwitch = true,
}: Props): ReactNode {
  const { t } = useLingui();
  const filterCount = layer.source.filters.rules.length;
  const showSwitch =
    showApplyAoiFilterSwitch && layer.geoBinding?.type !== "bufferOfLayer";

  return (
    <InspectorSection
      title={t`Filter`}
      focusRequest={focusRequest}
      note={
        filterCount === 0
          ? undefined
          : filterCount === 1
            ? t`1 filter`
            : t`${filterCount} filters`
      }
    >
      {showSwitch ? (
        <ApplyAoiFilterSwitch layer={layer} onLayerChange={onLayerChange} />
      ) : null}
      <QueryFiltersField
        columns={layer.source.queryColumns}
        value={layer.source.filters}
        onChange={(filters) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withFilters({
              layer: current,
              filters: filters,
            });
          });
        }}
      />
    </InspectorSection>
  );
}
