import { useLingui } from "@lingui/react/macro";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { applyMapStyles } from "@/views/GISApp/basemap/applyMapStyles";
import { mapStyles } from "@/views/GISApp/basemap/mapStyles";
import classes from "@/views/GISApp/MapCanvas/MapCanvas.module.css";
import { syncMap } from "@/views/GISApp/MapCanvas/syncMap";
import type { MapBounds } from "@/views/GISApp/layers/computeBounds/computeBounds";
import type { MapSpec } from "@/views/GISApp/layers/createMapSpec/MapSpec.types";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { StyleSpecification } from "maplibre-gl";
import type { ReactNode } from "react";

const EMPTY_MAP_SPEC: MapSpec = { sources: {}, layers: [] };

/**
 * MapLibre always needs a style, so a basemap of `none` renders a flat
 * background layer instead of tiles. That is the usable fallback when tile
 * hosts are unreachable.
 */
function _buildStyle(basemap: AvaMap.Basemap): string | StyleSpecification {
  if (basemap.type === "builtIn") {
    return mapStyles[basemap.style].url;
  }
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": basemap.background },
      },
    ],
  };
}

/** Identity of a basemap, used to skip redundant `setStyle` calls. */
function _buildStyleKey(basemap: AvaMap.Basemap): string {
  return basemap.type === "builtIn" ?
      `builtIn:${basemap.style}`
    : `none:${basemap.background}`;
}

/**
 * Compares two bounds by value rather than by reference, so a background
 * refetch that produces an identical bounding box in a new object does not
 * re-fly the camera and undo the user's pan.
 */
function _areBoundsEqual(
  first: MapBounds | undefined,
  second: MapBounds | undefined,
): boolean {
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

type Props = {
  basemap: AvaMap.Basemap;
  view: AvaMap.ViewState;
  spec: MapSpec;

  /** Bounds to fly to, or `undefined` to leave the camera alone. */
  fitBounds: MapBounds | undefined;

  /** Ids of layers whose features respond to clicks. */
  interactiveLayerIds: readonly string[];
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  children?: ReactNode;
};

/**
 * Owns the MapLibre instance: one construction, one style path, one click
 * handler. Rendering data is delegated to `syncMap`.
 */
export function MapCanvas({
  basemap,
  view,
  spec,
  fitBounds,
  interactiveLayerIds,
  onFeatureClick,
  children,
}: Props): JSX.Element {
  const { t } = useLingui();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const appliedSpecRef = useRef<MapSpec>(EMPTY_MAP_SPEC);
  const appliedStyleKeyRef = useRef<string | undefined>(undefined);
  const appliedFitBoundsRef = useRef<MapBounds | undefined>(undefined);
  const [isStyleReady, setIsStyleReady] = useState(false);

  // Latest-value refs, declared before the one-shot construction effect that
  // reads them, so its handlers stay current without re-registering.
  const interactiveLayerIdsRef = useRef(interactiveLayerIds);
  const onFeatureClickRef = useRef(onFeatureClick);
  const basemapRef = useRef(basemap);
  useEffect(() => {
    interactiveLayerIdsRef.current = interactiveLayerIds;
    onFeatureClickRef.current = onFeatureClick;
    basemapRef.current = basemap;
  }, [interactiveLayerIds, onFeatureClick, basemap]);

  // Construct the map exactly once. Style changes are handled below with
  // setStyle, so the instance survives them.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return undefined;
    }
    const initialBasemap = basemapRef.current;
    const map = new maplibregl.Map({
      container,
      style: _buildStyle(initialBasemap),
      center: [...view.center] as [number, number],
      zoom: view.zoom,
    });
    appliedStyleKeyRef.current = _buildStyleKey(initialBasemap);
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-right",
    );
    mapRef.current = map;

    // One map-level click handler covers every layer, present or future, so
    // adding and removing layers cannot accumulate listeners.
    const handleClick = (event: maplibregl.MapMouseEvent): void => {
      const existingLayerIds = interactiveLayerIdsRef.current.filter(
        (layerId) => {
          return map.getLayer(layerId);
        },
      );
      if (existingLayerIds.length === 0) {
        return;
      }
      const [feature] = map.queryRenderedFeatures(event.point, {
        layers: existingLayerIds,
      });
      if (feature) {
        onFeatureClickRef.current(feature as GeoJSON.Feature);
      }
    };
    map.on("click", handleClick);

    const handleStyleLoad = (): void => {
      // A style swap discards sources and layers, so the next sync must start
      // from an empty baseline.
      appliedSpecRef.current = EMPTY_MAP_SPEC;
      const currentBasemap = basemapRef.current;
      if (
        currentBasemap.type === "builtIn" &&
        currentBasemap.style === "avandar"
      ) {
        applyMapStyles(map);
      }
      setIsStyleReady(true);
    };
    map.on("style.load", handleStyleLoad);

    return () => {
      map.off("click", handleClick);
      map.off("style.load", handleStyleLoad);
      map.remove();
      mapRef.current = null;
      appliedSpecRef.current = EMPTY_MAP_SPEC;
      appliedStyleKeyRef.current = undefined;
      appliedFitBoundsRef.current = undefined;
      setIsStyleReady(false);
    };
    // Construction is intentionally one-shot: later prop changes are applied
    // by the effects below rather than by rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Style changes swap the style in place. `style.load` resets the applied
  // spec, and the sync effect below re-adds everything. The key check skips
  // the redundant swap on mount, where the constructor already applied it.
  //
  // Resetting `isStyleReady` here is a setState in response to a prop change,
  // which static analysis flags. It is deliberate and cannot be derived during
  // render: the flag tracks MapLibre's asynchronous `style.load` event, and
  // only MapLibre knows when the new style has finished loading. Deriving it,
  // or keying this component on the basemap, would rebuild the map on every
  // style change, which is the behavior this canvas exists to avoid. The key
  // check above keeps the reset from firing on unrelated re-renders.
  useEffect(() => {
    const map = mapRef.current;
    const nextStyleKey = _buildStyleKey(basemap);
    if (!map || appliedStyleKeyRef.current === nextStyleKey) {
      return;
    }
    appliedStyleKeyRef.current = nextStyleKey;
    setIsStyleReady(false);
    map.setStyle(_buildStyle(basemap));
  }, [basemap]);

  // Apply the declarative spec whenever it or the style changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleReady) {
      return;
    }
    syncMap({ map, previousSpec: appliedSpecRef.current, nextSpec: spec });
    appliedSpecRef.current = spec;
  }, [spec, isStyleReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBounds) {
      return;
    }
    if (_areBoundsEqual(appliedFitBoundsRef.current, fitBounds)) {
      return;
    }
    appliedFitBoundsRef.current = fitBounds;
    map.fitBounds(fitBounds as [[number, number], [number, number]], {
      padding: 50,
      duration: 1000,
    });
  }, [fitBounds]);

  useEffect(() => {
    const handleResize = (): void => {
      mapRef.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={classes.canvas}
        role="application"
        aria-label={t`Map`}
      />
      {children}
    </>
  );
}
