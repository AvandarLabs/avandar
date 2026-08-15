import { useEffect, useState } from "react";
import type { MapInstance } from "@/views/GisApp/MapCanvas/useMapInstance";

/** Describes whether the furniture bar can show a truthful scale. */
export type MapScale =
  | { kind: "bar"; widthPx: number; meters: number }
  | { kind: "varies" };

type ScaleInputs = {
  metersPerPixel: number;
  zoom: number;
  maxWidthPx: number;
};

/** Zoom below which a single Mercator scale bar is not truthful. */
const SCALE_VARIES_BELOW_ZOOM = 4;

/** Widths a scale bar may represent, as 1, 2, or 5 times a power of ten. */
const NICE_MULTIPLES = [1, 2, 5] as const;

/** The widest scale bar the furniture strip draws, in CSS pixels. */
const SCALE_BAR_MAX_WIDTH_PX = 80;

/** Returns the largest nice distance that fits in the supplied distance. */
function _getNiceMeters(maxMeters: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(maxMeters));
  const fitting = NICE_MULTIPLES.filter((multiple) => {
    return multiple * magnitude <= maxMeters;
  });
  const largest = fitting[fitting.length - 1] ?? 1;
  return largest * magnitude;
}

/** Returns whether the scale inputs can produce a finite, visible bar. */
function _hasValidScaleInputs({
  metersPerPixel,
  zoom,
  maxWidthPx,
}: ScaleInputs): boolean {
  return (
    Number.isFinite(metersPerPixel) &&
    metersPerPixel > 0 &&
    Number.isFinite(zoom) &&
    Number.isFinite(maxWidthPx) &&
    maxWidthPx > 0
  );
}

/**
 * Calculates the scale bar for a map resolution.
 *
 * @param params.metersPerPixel Ground distance covered by one screen pixel.
 * @param params.zoom Current zoom, used for low-zoom suppression.
 * @param params.maxWidthPx The widest bar the furniture strip will draw.
 * Returns `varies` when the derived maximum distance is not positive and
 * finite, so the bar never displays an invalid zero or infinite distance.
 */
/** Scale calculations and live camera tracking for the map furniture bar. */
export const MapScale = {
  /** Calculates the scale bar for a map resolution. */
  getFromMetersPerPixel: ({
    metersPerPixel,
    zoom,
    maxWidthPx,
  }: ScaleInputs): MapScale => {
    if (
      !_hasValidScaleInputs({ metersPerPixel, zoom, maxWidthPx }) ||
      zoom < SCALE_VARIES_BELOW_ZOOM
    ) {
      return { kind: "varies" };
    }
    const maxMeters = metersPerPixel * maxWidthPx;
    if (!Number.isFinite(maxMeters) || maxMeters <= 0) {
      return { kind: "varies" };
    }
    const meters = _getNiceMeters(maxMeters);
    return {
      kind: "bar",
      widthPx: Math.max(1, Math.round(meters / metersPerPixel)),
      meters,
    };
  },

  /** Tracks the map's scale as its camera moves. */
  useMapScale: (mapInstance: MapInstance): MapScale | undefined => {
    const { mapRef } = mapInstance;
    const [scale, setScale] = useState<MapScale | undefined>(undefined);
    useEffect(
      function trackMapScale() {
        const map = mapRef.current;
        if (!map) {
          return undefined;
        }
        const readScale = (): void => {
          const centerY = map.getContainer().clientHeight / 2;
          // MapLibre's public types do not expose meters per pixel, so use the
          // public two-point distance instead of an internal transform.
          const leftCoordinate = map.unproject([0, centerY]);
          const rightCoordinate = map.unproject([
            SCALE_BAR_MAX_WIDTH_PX,
            centerY,
          ]);
          setScale(
            MapScale.getFromMetersPerPixel({
              metersPerPixel:
                leftCoordinate.distanceTo(rightCoordinate) /
                SCALE_BAR_MAX_WIDTH_PX,
              zoom: map.getZoom(),
              maxWidthPx: SCALE_BAR_MAX_WIDTH_PX,
            }),
          );
        };
        readScale();
        map.on("move", readScale);
        return () => {
          map.off("move", readScale);
        };
      },
      [mapRef],
    );
    return scale;
  },
};
