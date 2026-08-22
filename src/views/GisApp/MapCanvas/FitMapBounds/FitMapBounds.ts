import type { MapBounds } from "@/views/GisApp/layers/getBoundsFromFeatureCollection/getBoundsFromFeatureCollection";
import type { MapChromeInsets } from "@/views/GisApp/shell/useMapChromeInsets/useMapChromeInsets";
import type { RefObject } from "react";

import { useReducedMotion } from "@mantine/hooks";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function _areBoundsEqual(
  options: Readonly<{
    first: MapBounds | undefined;
    second: MapBounds | undefined;
  }>,
): boolean {
  const { first, second } = options;
  if (first === second) {
    return true;
  }
  if (!first || !second) {
    return false;
  }
  return (
    first[0][0] === second[0][0] &&
    first[0][1] === second[0][1] &&
    first[1][0] === second[1][0] &&
    first[1][1] === second[1][1]
  );
}

function _arePaddingEqual(
  options: Readonly<{
    first: MapChromeInsets | undefined;
    second: MapChromeInsets | undefined;
  }>,
): boolean {
  const { first, second } = options;
  if (first === second) {
    return true;
  }
  if (!first || !second) {
    return false;
  }
  return (
    first.top === second.top &&
    first.right === second.right &&
    first.bottom === second.bottom &&
    first.left === second.left
  );
}

/** A camera move requested by the map application. */
export type FitBoundsRequest = {
  id: number;
  bounds: MapBounds;
  padding: MapChromeInsets;
};

/** Camera flight duration when motion is not reduced, in milliseconds. */
const FIT_BOUNDS_DURATION_MS = 800;

/**
 * Highest zoom an automatic camera fit may use. Past this, typical vector
 * basemaps overzoom into a featureless background that looks like an error.
 */
const FIT_BOUNDS_MAX_ZOOM = 14;

type LegacyFitBoundsRequestStore = {
  getServerSnapshot: () => FitBoundsRequest | undefined;
  getSnapshot: () => FitBoundsRequest | undefined;
  subscribe: (listener: () => void) => () => void;
  update: (bounds: MapBounds | undefined, padding: MapChromeInsets) => void;
};

type LegacyStoreState = {
  previousBounds: MapBounds | undefined;
  previousPadding: MapChromeInsets | undefined;
  requestId: number;
  request: FitBoundsRequest | undefined;
};

/** Updates a legacy request store and notifies its subscribers. */
function _updateLegacyStore(
  options: Readonly<{
    state: LegacyStoreState;
    listeners: ReadonlySet<() => void>;
    bounds: MapBounds | undefined;
    padding: MapChromeInsets;
  }>,
): void {
  const { state, listeners, bounds, padding } = options;
  const hasBoundsChanged = !_areBoundsEqual({
    first: state.previousBounds,
    second: bounds,
  });
  const hasPaddingChanged = !_arePaddingEqual({
    first: state.previousPadding,
    second: padding,
  });
  if (!hasBoundsChanged && !hasPaddingChanged) {
    return;
  }
  state.previousBounds = bounds;
  state.previousPadding = padding;
  if (!bounds && state.request === undefined) {
    return;
  }
  if (bounds) {
    state.requestId += 1;
  }
  state.request = bounds ? { id: state.requestId, bounds, padding } : undefined;
  listeners.forEach((listener) => {
    listener();
  });
}

function _createLegacyFitBoundsRequestStore(): LegacyFitBoundsRequestStore {
  const state: LegacyStoreState = {
    previousBounds: undefined,
    previousPadding: undefined,
    requestId: 0,
    request: undefined,
  };
  const listeners = new Set<() => void>();
  const getSnapshot = (): FitBoundsRequest | undefined => {
    return state.request;
  };
  const getServerSnapshot = (): FitBoundsRequest | undefined => {
    return undefined;
  };
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const update = (bounds: MapBounds | undefined, padding: MapChromeInsets) => {
    _updateLegacyStore({ state, listeners, bounds, padding });
  };
  return { getServerSnapshot, getSnapshot, subscribe, update };
}

function useLegacyStoreUpdate(
  options: Readonly<{
    store: LegacyFitBoundsRequestStore;
    bounds: MapBounds | undefined;
    padding: MapChromeInsets;
  }>,
): void {
  const { store, bounds, padding } = options;
  const southwestLongitude = bounds?.[0]?.[0];
  const southwestLatitude = bounds?.[0]?.[1];
  const northeastLongitude = bounds?.[1]?.[0];
  const northeastLatitude = bounds?.[1]?.[1];
  const { top, right, bottom, left } = padding;
  useEffect(
    function updateLegacyFitBoundsRequest() {
      const nextBounds: MapBounds | undefined =
        southwestLongitude === undefined ||
        southwestLatitude === undefined ||
        northeastLongitude === undefined ||
        northeastLatitude === undefined
          ? undefined
          : [
              [southwestLongitude, southwestLatitude],
              [northeastLongitude, northeastLatitude],
            ];
      store.update(nextBounds, { top, right, bottom, left });
    },
    [
      store,
      southwestLongitude,
      southwestLatitude,
      northeastLongitude,
      northeastLatitude,
      top,
      right,
      bottom,
      left,
    ],
  );
}

/** Legacy request adaptation and live map camera fitting. */
export const FitMapBounds = {
  /**
   * Adapts legacy bounds data to a stable, monotonic camera request.
   *
   * The request id changes only when the bounds change by value, so a
   * background refetch cannot reapply an identical camera move.
   */
  useLegacyFitBoundsRequest: ({
    bounds,
    padding,
  }: Readonly<{
    bounds: MapBounds | undefined;
    padding: MapChromeInsets;
  }>): FitBoundsRequest | undefined => {
    const [store] = useState(_createLegacyFitBoundsRequestStore);
    useLegacyStoreUpdate({ store, bounds, padding });
    return useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getServerSnapshot,
    );
  },

  /** Applies each camera request once, using the request id as its identity. */
  useFitMapBounds: ({
    mapInstance,
    request,
  }: Readonly<{
    mapInstance: {
      mapRef: RefObject<
        | {
            fitBounds: (
              bounds: MapBounds,
              options: {
                padding: MapChromeInsets;
                animate: boolean;
                duration: number;
                maxZoom: number;
              },
            ) => unknown;
          }
        | undefined
      >;
    };
    request: FitBoundsRequest | undefined;
  }>): void => {
    const { mapRef } = mapInstance;
    const appliedRequestIdRef = useRef<number | undefined>(undefined);
    const prefersReducedMotion = useReducedMotion();

    useEffect(
      function applyFitBoundsRequest() {
        const map = mapRef.current;
        if (!map || !request) {
          return;
        }
        if (appliedRequestIdRef.current === request.id) {
          return;
        }
        appliedRequestIdRef.current = request.id;
        map.fitBounds(request.bounds, {
          padding: request.padding,
          animate: !prefersReducedMotion,
          duration: prefersReducedMotion ? 0 : FIT_BOUNDS_DURATION_MS,
          maxZoom: FIT_BOUNDS_MAX_ZOOM,
        });
      },
      [mapRef, prefersReducedMotion, request],
    );
  },
};
