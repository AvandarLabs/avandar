import maplibregl, {
  MapLayerMouseEvent,
  Map as MapLibreMap,
  Popup,
} from "maplibre-gl";
import { RefObject, useEffect, useRef } from "react";

const GEOJSON_SOURCE_ID = "broad-st-cholera-source";
const GEOJSON_LAYER_ID = "broad-st-cholera-layer";

export type MapViewState = {
  latLong: [number, number];
  zoom: number;
};

/**
 * Hook to load and display Broad Street cholera data on a MapLibre map.
 * Automatically loads the GeoJSON data and adds it as a point layer.
 */
export function useBroadStCholeraData(
  map: MapLibreMap | null,
  mapViewState: RefObject<MapViewState>,
): void {
  const dataLoadedRef = useRef(false);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    const loadData = async () => {
      try {
        // Load the GeoJSON file
        const response = await fetch(
          "/test-data/broad_st_deaths_by_bldg.geojson",
        );
        if (!response.ok) {
          console.error("Failed to load Broad Street cholera data");
          return;
        }

        const geojsonData = await response.json();

        // Calculate bounds from GeoJSON features
        const calculateBounds = (
          features: GeoJSON.Feature[],
        ): [[number, number], [number, number]] => {
          let minLng = Infinity;
          let minLat = Infinity;
          let maxLng = -Infinity;
          let maxLat = -Infinity;

          features.forEach((feature) => {
            if (feature.geometry.type === "Point") {
              const [lng, lat] = feature.geometry.coordinates;
              if (lat !== undefined && lng !== undefined) {
                minLng = Math.min(minLng, lng);
                minLat = Math.min(minLat, lat);
                maxLng = Math.max(maxLng, lng);
                maxLat = Math.max(maxLat, lat);
              }
            }
          });

          return [
            [minLng, minLat],
            [maxLng, maxLat],
          ];
        };

        const bounds = calculateBounds(geojsonData.features);

        // Wait for map to be loaded before adding source
        const addSourceAndLayer = () => {
          if (!map.getSource(GEOJSON_SOURCE_ID)) {
            // Add the GeoJSON source
            map.addSource(GEOJSON_SOURCE_ID, {
              type: "geojson",
              data: geojsonData,
            });

            // Add a circle layer to display the points
            if (!map.getLayer(GEOJSON_LAYER_ID)) {
              map.addLayer({
                id: GEOJSON_LAYER_ID,
                type: "circle",
                source: GEOJSON_SOURCE_ID,
                paint: {
                  "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["get", "deaths"],
                    0,
                    4,
                    5,
                    8,
                    10,
                    12,
                    15,
                    16,
                  ],
                  "circle-color": [
                    "interpolate",
                    ["linear"],
                    ["get", "deaths"],
                    0,
                    "#fee5d9",
                    2,
                    "#fcae91",
                    4,
                    "#fb6a4a",
                    6,
                    "#de2d26",
                    8,
                    "#a50f15",
                  ],
                  "circle-opacity": 0.8,
                  "circle-stroke-width": 1,
                  "circle-stroke-color": "#ffffff",
                },
              });

              // Recenter map to fit the data bounds
              map.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                duration: 1000,
              });

              // Update initial lat/long and zoom after fitBounds completes
              if (mapViewState) {
                map.once("moveend", () => {
                  const center = map.getCenter();
                  const zoom = map.getZoom();
                  mapViewState.current = {
                    latLong: [center.lat, center.lng],
                    zoom,
                  };
                });
              }
            }
          }
        };

        // If map is already loaded, add source/layer immediately
        if (map.loaded()) {
          addSourceAndLayer();
        } else {
          // Otherwise wait for map to load
          map.once("load", addSourceAndLayer);
        }

        dataLoadedRef.current = true;
      } catch (error) {
        console.error("Error loading Broad Street cholera data:", error);
      }
    };

    loadData();

    // Create popup instance for displaying feature data
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "300px",
    });
    popupRef.current = popup;

    // Handle click events on the layer
    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || !feature.properties) {
        return;
      }

      const properties = feature.properties;
      const deaths = properties.deaths ?? "N/A";
      const pumpID = properties.pumpID ?? "N/A";
      const distBSpump = properties.distBSpump ?? "N/A";
      const BSpump = properties.BSpump === 1 ? "Yes" : "No";

      // Create HTML content with Mantine-like styling
      const htmlContent = `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 12px;
          color: #212529;
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #1c1c1e;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 8px;
          ">
            Building #${properties.id ?? "N/A"}
          </div>
          <div style="
            display: flex;
            flex-direction: column;
            gap: 8px;
          ">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span style="
                font-weight: 500;
                color: #495057;
                font-size: 14px;
              ">Deaths:</span>
              <span style="
                font-weight: 600;
                color: #dc3545;
                font-size: 14px;
              ">${deaths}</span>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span style="
                font-weight: 500;
                color: #495057;
                font-size: 14px;
              ">Pump ID:</span>
              <span style="
                font-weight: 500;
                color: #212529;
                font-size: 14px;
              ">${pumpID}</span>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span style="
                font-weight: 500;
                color: #495057;
                font-size: 14px;
              ">Distance to BS Pump:</span>
              <span style="
                font-weight: 500;
                color: #212529;
                font-size: 14px;
              ">${typeof distBSpump === "number" ? distBSpump.toFixed(2) : distBSpump}m</span>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <span style="
                font-weight: 500;
                color: #495057;
                font-size: 14px;
              ">Broad St Pump:</span>
              <span style="
                font-weight: 500;
                color: #212529;
                font-size: 14px;
              ">${BSpump}</span>
            </div>
          </div>
        </div>
      `;

      // Set popup content and position
      popup.setLngLat(e.lngLat).setHTML(htmlContent).addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    // Add click event listener to the layer
    map.on("click", GEOJSON_LAYER_ID, handleClick);

    // Change cursor to pointer when hovering over the layer
    map.on("mouseenter", GEOJSON_LAYER_ID, handleMouseEnter);
    map.on("mouseleave", GEOJSON_LAYER_ID, handleMouseLeave);

    // Handle style changes - re-add source and layer when style changes
    const handleStyleData = () => {
      if (dataLoadedRef.current && map.getSource(GEOJSON_SOURCE_ID)) {
        // Source already exists, just ensure layer exists
        if (!map.getLayer(GEOJSON_LAYER_ID)) {
          map.addLayer({
            id: GEOJSON_LAYER_ID,
            type: "circle",
            source: GEOJSON_SOURCE_ID,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["get", "deaths"],
                0,
                4,
                5,
                8,
                10,
                12,
                15,
                16,
              ],
              "circle-color": [
                "interpolate",
                ["linear"],
                ["get", "deaths"],
                0,
                "#fee5d9",
                2,
                "#fcae91",
                4,
                "#fb6a4a",
                6,
                "#de2d26",
                8,
                "#a50f15",
              ],
              "circle-opacity": 0.8,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });
        }
      }
    };

    map.on("style.load", handleStyleData);

    return () => {
      try {
        // Cleanup: remove event listeners
        map.off("click", GEOJSON_LAYER_ID, handleClick);
        map.off("mouseenter", GEOJSON_LAYER_ID, handleMouseEnter);
        map.off("mouseleave", GEOJSON_LAYER_ID, handleMouseLeave);
        map.off("style.load", handleStyleData);

        // Remove popup if it exists
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }

        // Cleanup: remove layer and source
        if (map.getLayer(GEOJSON_LAYER_ID)) {
          map.removeLayer(GEOJSON_LAYER_ID);
        }
        if (map.getSource(GEOJSON_SOURCE_ID)) {
          map.removeSource(GEOJSON_SOURCE_ID);
        }
      } catch (error) {
        // Map style might be in transition, ignore cleanup errors

        console.error(
          "Could not cleanup map layers during style transition:",
          error,
        );
      }
    };
  }, [map, mapViewState]);
}
