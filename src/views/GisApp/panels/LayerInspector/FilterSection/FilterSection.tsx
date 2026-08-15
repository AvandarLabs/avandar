import { useLingui } from "@lingui/react/macro";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  focusRequest?: number;
};

/** Renders the source filter tree and its top-level rule count. */
export function FilterSection({
  layer,
  onLayerChange,
  focusRequest,
}: Props): ReactNode {
  const { t } = useLingui();
  const filterCount = layer.source.filters.rules.length;

  return (
    <InspectorSection
      title={t`Filter`}
      focusRequest={focusRequest}
      note={
        filterCount === 0 ? undefined
        : filterCount === 1 ?
          t`1 filter`
        : t`${filterCount} filters`
      }
    >
      <QueryFiltersField
        columns={layer.source.queryColumns}
        value={layer.source.filters}
        onChange={(filters) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withFilters(current, filters);
          });
        }}
      />
    </InspectorSection>
  );
}
