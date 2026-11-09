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

type SpatialFilterOption = { value: MapLayer.Id; label: string };

/**
 * Lists the candidate layers, plus the saved filter layer when it is no
 * longer a candidate, so a stale filter is visible and can be cleared.
 */
function _buildSpatialFilterOptions(params: {
  candidates: readonly MapLayer.T[];
  layers: readonly MapLayer.T[];
  currentFilterLayerId: MapLayer.Id | undefined;
  unavailableLabel: string;
}): SpatialFilterOption[] {
  const { candidates, layers, currentFilterLayerId, unavailableLabel } = params;
  const candidateOptions = candidates.map((candidate) => {
    return { value: candidate.id, label: candidate.name };
  });
  const isStale =
    currentFilterLayerId !== undefined &&
    !candidates.some((candidate) => {
      return candidate.id === currentFilterLayerId;
    });
  if (!isStale) {
    return candidateOptions;
  }
  const staleFilterLayer = layers.find((candidate) => {
    return candidate.id === currentFilterLayerId;
  });
  return [
    ...candidateOptions,
    {
      value: currentFilterLayerId,
      label: staleFilterLayer?.name ?? unavailableLabel,
    },
  ];
}

/**
 * Picks the area layer whose shapes this layer's features must fall inside,
 * such as a buffer around exposure sites. Rendered by `FilterSection` beside
 * the area filter switch. Only layers that output polygons and do not depend
 * on this layer are offered. A saved filter that is no longer offered stays
 * listed, under its layer's name or as unavailable, so it can be cleared.
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
  const currentFilterLayerId = layer.spatialFilter?.layerId;
  const options = _buildSpatialFilterOptions({
    candidates,
    layers,
    currentFilterLayerId,
    unavailableLabel: t`Unavailable layer`,
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
      data={options}
      value={currentFilterLayerId ?? null}
      disabled={options.length === 0}
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
