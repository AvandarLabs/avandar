import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { isGeometryFamily } from "$/models/AvaMap/MapLayer/MapLayer";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  family: MapLayer.GeometryFamily;
  isAggregateOnly: boolean;
  onLayerChange: LayerChangeHandler;
};

/** Selects the expected geometry family for a geometry-column binding. */
export function GeometryFamilySelect({
  family,
  isAggregateOnly,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Expected geometry`}
      data={[
        { value: "point", label: t`Point`, disabled: isAggregateOnly },
        { value: "line", label: t`Line`, disabled: isAggregateOnly },
        { value: "polygon", label: t`Polygon` },
      ]}
      value={family}
      allowDeselect={false}
      description={
        isAggregateOnly ?
          t`Aggregate-only layers require an area-producing binding.`
        : undefined
      }
      onChange={(nextFamily) => {
        if (!nextFamily || !isGeometryFamily(nextFamily)) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withGeometryFamily({
            layer: current,
            family: nextFamily,
          });
        });
      }}
    />
  );
}
