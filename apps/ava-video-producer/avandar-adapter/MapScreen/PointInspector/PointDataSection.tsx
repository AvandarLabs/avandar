import { Select } from "@mantine/core";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { PointCoordinateFields } from "./PointCoordinateFields";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; isDataOpen: boolean };
const _noop = () => {
  return undefined;
};
/** Preserve the native data section's reset key and source-control ordering. */
export function PointDataSection({
  layer,
  isDataOpen,
}: Readonly<Props>): ReactNode {
  return (
    <div>
      <InspectorSection
        key={String(isDataOpen)}
        title="Data"
        defaultOpen={isDataOpen}
      >
        <Select
          label="Source"
          value={layer.id}
          data={[{ value: layer.id, label: layer.name }]}
          onChange={_noop}
        />
        <Select
          label="Geometry"
          value="latLngColumns"
          data={[
            {
              value: "latLngColumns",
              label: "Latitude and longitude columns",
            },
          ]}
          allowDeselect={false}
          onChange={_noop}
        />
        <PointCoordinateFields />
      </InspectorSection>
    </div>
  );
}
