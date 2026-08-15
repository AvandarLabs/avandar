import { assertIsNonEmptyArray, isDefined } from "@avandar/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { FitBoundsRequest as CameraFitBoundsRequest } from "@/views/GisApp/MapCanvas/FitMapBounds/FitMapBounds";
import type { MapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
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

/** Requests a camera fit once when each layer first has usable geometry. */
/** Explicit and first-render camera-fit request hooks. */
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
          bounds,
          padding: insetsRef.current,
        });
      },
      [insetsRef],
    );
    return { fitBoundsRequest, requestFitBounds };
  },

  /** Requests a camera fit once when each layer first has usable geometry. */
  useAutoFitNewLayers: ({
    layerBounds,
    requestFitBounds,
  }: Readonly<{
    layerBounds: ReadonlyMap<MapLayer.Id, MapBounds | undefined>;
    requestFitBounds: (bounds: MapBounds) => void;
  }>): void => {
    const fittedLayerIdsRef = useRef(new Set<MapLayer.Id>());
    useEffect(
      function fitFirstRenderOfEachLayer() {
        const newlyReadyEntries = [...layerBounds].filter(
          ([layerId, bounds]) => {
            return Boolean(bounds) && !fittedLayerIdsRef.current.has(layerId);
          },
        );
        fittedLayerIdsRef.current = new Set([
          ...fittedLayerIdsRef.current,
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
