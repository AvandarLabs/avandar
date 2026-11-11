import { assertIsNonEmptyArray, isDefined } from "@avandar/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { WEB_MERCATOR_MAX_LATITUDE } from "@/clients/maps/MapLayerSpatialQuery/PointAggregate/PointAggregate.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { FitBoundsRequest as CameraFitBoundsRequest } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";
import type { MapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import type { RefObject } from "react";

/** Returns the bounds enclosing every supplied bounds value. */
function _getUnionBounds(boundsList: readonly MapBounds[]): MapBounds {
  assertIsNonEmptyArray(boundsList, "At least one bounds value is required");
  const [firstBounds, ...remainingBounds] = boundsList;

  return remainingBounds.reduce<MapBounds>((unionBounds, bounds) => {
    return [
      [
        Math.min(unionBounds[0][0], bounds[0][0]),
        Math.min(unionBounds[0][1], bounds[0][1]),
      ],
      [
        Math.max(unionBounds[1][0], bounds[1][0]),
        Math.max(unionBounds[1][1], bounds[1][1]),
      ],
    ];
  }, firstBounds);
}

/**
 * Clamps latitude to the range a Web Mercator camera can show. A coordinate at
 * a pole projects to infinity, so a camera asked to fit it would zoom out to
 * the whole world.
 */
function _clampToWebMercator(bounds: MapBounds): MapBounds {
  const clampLatitude = (latitude: number): number => {
    return Math.min(
      Math.max(latitude, -WEB_MERCATOR_MAX_LATITUDE),
      WEB_MERCATOR_MAX_LATITUDE,
    );
  };
  const [[west, south], [east, north]] = bounds;
  return [
    [west, clampLatitude(south)],
    [east, clampLatitude(north)],
  ];
}

/** Explicit and new-layer camera-fit request hooks. */
export const FitBoundsRequest = {
  /** Creates explicit camera requests using the current panel-aware padding. */
  useFitBoundsRequest: (
    insetsRef: RefObject<MapChromeInsets>,
  ): {
    fitBoundsRequest: CameraFitBoundsRequest | undefined;
    requestFitBounds: (bounds: MapBounds) => void;
  } => {
    const nextIdRef = useRef(0);
    const [fitBoundsRequest, setFitBoundsRequest] = useState<
      CameraFitBoundsRequest | undefined
    >(undefined);
    const requestFitBounds = useCallback(
      (bounds: MapBounds) => {
        nextIdRef.current += 1;
        setFitBoundsRequest({
          id: nextIdRef.current,
          bounds: _clampToWebMercator(bounds),
          padding: insetsRef.current,
        });
      },
      [insetsRef],
    );
    return { fitBoundsRequest, requestFitBounds };
  },

  /**
   * Requests a camera fit once when a layer added during this session first
   * has usable geometry. Layers the map already had when it opened never
   * trigger a fit, so the author's saved view wins on open. A map that opened
   * empty still fits its first layer.
   */
  useAutoFitNewLayers: ({
    layerBounds,
    requestFitBounds,
  }: Readonly<{
    layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>;
    requestFitBounds: (bounds: MapBounds) => void;
  }>): void => {
    // Seeded with the layers present on open, so they count as already fitted.
    const [initialLayerIds] = useState(() => {
      return new Set(layerBounds.keys());
    });
    const fittedLayerIdsRef = useRef<ReadonlySet<MapLayer.Id>>(initialLayerIds);
    useEffect(
      function fitLayersAddedThisSession() {
        const fittedLayerIds = fittedLayerIdsRef.current;
        const newlyReadyEntries = [...layerBounds].filter(
          ([layerId, bounds]) => {
            return Boolean(bounds) && !fittedLayerIds.has(layerId);
          },
        );
        fittedLayerIdsRef.current = new Set([
          ...fittedLayerIds,
          ...newlyReadyEntries.map(([layerId]) => {
            return layerId;
          }),
        ]);
        const newlyReadyBounds = newlyReadyEntries
          .map(([, bounds]) => {
            return bounds;
          })
          .filter(isDefined);
        if (newlyReadyBounds.length > 0) {
          requestFitBounds(_getUnionBounds(newlyReadyBounds));
        }
      },
      [layerBounds, requestFitBounds],
    );
  },
};
