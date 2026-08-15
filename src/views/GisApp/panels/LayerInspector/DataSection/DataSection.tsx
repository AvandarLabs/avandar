import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { CoordinateBindingControls } from "@/views/GisApp/panels/LayerInspector/DataSection/CoordinateBindingControls";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits the layer's data source and geometry binding. */
export function DataSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <InspectorSection title={t`Data`} defaultOpen>
      <QueryDataSourceSelect
        label={t`Source`}
        value={layer.source.dataSource ?? null}
        onChange={(dataSource) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withDataSource(
              current,
              dataSource ?? undefined,
            );
          });
        }}
      />
      <Select
        label={t`Geometry`}
        data={[
          {
            value: "latLngColumns",
            label: t`Latitude and longitude columns`,
          },
        ]}
        value="latLngColumns"
        allowDeselect={false}
        readOnly
        description={t`Geometry columns, boundary joins, and grid binning arrive in a later release.`}
      />
      <CoordinateBindingControls layer={layer} onLayerChange={onLayerChange} />
    </InspectorSection>
  );
}
