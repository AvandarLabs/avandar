import { useEffect } from "react";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Persisted derived legend payload for one map layer. */
export type LayerLegendUpdate = {
  layerFingerprint: string;
  breaks: readonly MapLayer.LegendBreak[];
  entries: readonly MapLayer.LegendEntry[];
  sizeStops: readonly MapLayer.SizeLegendStop[];
};

type Options = {
  mapConfig: AvaMapConfig.T;
  legendUpdates: ReadonlyMap<MapLayer.Id, LayerLegendUpdate>;
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
};

function _makeFingerprintFromMapLayer(layer: MapLayer.T): string {
  return JSON.stringify({
    source: layer.source,
    geoBinding: layer.geoBinding,
    symbology: layer.symbology,
    sensitivity: layer.sensitivity,
  });
}

function _isLegendEqual(layer: MapLayer.T, update: LayerLegendUpdate): boolean {
  return (
    JSON.stringify(layer.legend.breaks) === JSON.stringify(update.breaks) &&
    JSON.stringify(layer.legend.entries) === JSON.stringify(update.entries) &&
    JSON.stringify(layer.legend.sizeStops) === JSON.stringify(update.sizeStops)
  );
}

function _hasApplicableUpdate(
  mapConfig: AvaMapConfig.T,
  updates: ReadonlyMap<MapLayer.Id, LayerLegendUpdate>,
): boolean {
  return mapConfig.layers.some((layer) => {
    const update = updates.get(layer.id);
    return (
      update !== undefined &&
      update.layerFingerprint === _makeFingerprintFromMapLayer(layer) &&
      !_isLegendEqual(layer, update)
    );
  });
}

function usePersistedLayerLegends(options: Options): void {
  const { legendUpdates, mapConfig, updateConfig } = options;
  useEffect(
    function persistDerivedLayerLegends() {
      if (!_hasApplicableUpdate(mapConfig, legendUpdates)) {
        return;
      }
      updateConfig((current) => {
        const layers = current.layers.map((layer) => {
          const update = legendUpdates.get(layer.id);
          if (
            !update ||
            update.layerFingerprint !== _makeFingerprintFromMapLayer(layer) ||
            _isLegendEqual(layer, update)
          ) {
            return layer;
          }
          return {
            ...layer,
            legend: {
              ...layer.legend,
              breaks: update.breaks,
              entries: update.entries,
              sizeStops: update.sizeStops,
            },
          } as MapLayer.T;
        });
        return { ...current, layers };
      });
    },
    [legendUpdates, mapConfig, updateConfig],
  );
}

/** Fingerprint and persistence helpers for derived layer legends. */
export const PersistedLayerLegends = {
  makeFingerprintFromMapLayer: _makeFingerprintFromMapLayer,
  usePersistedLayerLegends,
};
