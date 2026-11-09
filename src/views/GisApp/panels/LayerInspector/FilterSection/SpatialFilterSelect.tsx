import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { getSpatialFilterCandidatesFromLayers } from "$/models/AvaMap/AvaMapConfig/getSpatialFilterCandidatesFromLayers/getSpatialFilterCandidatesFromLayers";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  layers: readonly MapLayer.T[];
  onLayerChange: LayerChangeHandler;
};

/**
 * Picks the area layer whose shapes this layer's features must fall inside,
 * such as a buffer around exposure sites. Rendered by `FilterSection` beside
 * the area filter switch. Only layers that output polygons and do not depend
 * on this layer are offered.
 */
export function SpatialFilterSelect({
  layer,
  layers,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const candidates = getSpatialFilterCandidatesFromLayers({
    layers,
    layerId: layer.id,
  });
  return (
    <Select<MapLayer.Id>
      label={t`Only show features inside`}
      placeholder={t`Anywhere`}
      description={
        candidates.length === 0
          ? t`Add an area layer, such as a buffer, to filter by it.`
          : undefined
      }
      data={candidates.map((candidate) => {
        return { value: candidate.id, label: candidate.name };
      })}
      value={layer.spatialFilter?.layerId ?? null}
      disabled={candidates.length === 0}
      clearable
      onChange={(spatialFilterLayerId) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withSpatialFilter({
            layer: current,
            spatialFilterLayerId: spatialFilterLayerId ?? undefined,
          });
        });
      }}
    />
  );
}
