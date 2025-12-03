import maplibregl, {
  MapLayerMouseEvent,
  Map as MapLibreMap,
  Popup,
} from "maplibre-gl";
import { RefObject, useEffect, useRef } from "react";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { isOfModelType } from "@/lib/utils/guards/guards";
import { QueryColumn } from "@/models/queries/QueryColumn";
import { QueryColumns } from "@/models/queries/QueryColumn/QueryColumns";
import { QueryDataSource } from "@/models/queries/QueryDataSource";

const GEOJSON_SOURCE_ID = "selected-datasource-source";
const GEOJSON_LAYER_ID = "selected-datasource-layer";

export type MapViewState = {
  latLong: [number, number];
  zoom: number;
};

type UseSelectedMapDataSourceOptions = {
  map: MapLibreMap | null;
  mapViewState: RefObject<MapViewState>;
  selectedDataSource?: QueryDataSource;
  latitudeColumn?: QueryColumn;
  longitudeColumn?: QueryColumn;
};

/**
 * Hook to load and display selected data source on a MapLibre map.
 * When a data source, latitude column, and longitude column are selected,
 * it loads the dataset, converts it to GeoJSON, and displays it on the map.
 * The map will still render even when no selections are made.
 */
export function useSelectedMapDataSource({
  map,
  mapViewState,
  selectedDataSource,
  latitudeColumn,
  longitudeColumn,
}: UseSelectedMapDataSourceOptions): void {
  const dataLoadedRef = useRef(false);
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    // Only proceed if all three selections are made
    if (
      !selectedDataSource ||
      !latitudeColumn ||
      !longitudeColumn ||
      !isOfModelType("Dataset", selectedDataSource)
    ) {
      // Remove existing layer and source if they exist
      if (map.getLayer(GEOJSON_LAYER_ID)) {
        map.removeLayer(GEOJSON_LAYER_ID);
      }
      if (map.getSource(GEOJSON_SOURCE_ID)) {
        map.removeSource(GEOJSON_SOURCE_ID);
      }
      dataLoadedRef.current = false;
      return;
    }

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
            Data Point
          </div>
          <div style="
            display: flex;
            flex-direction: column;
            gap: 8px;
          ">
            ${Object.entries(properties)
              .map(([key, value]) => {
                return `
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
                <span style="
                  font-weight: 500;
                  color: #495057;
                  font-size: 14px;
                ">${key}:</span>
                <span style="
                  font-weight: 500;
                  color: #212529;
                  font-size: 14px;
                ">${value ?? "N/A"}</span>
              </div>
            `;
              })
              .join("")}
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

    const loadData = async () => {
      try {
        const datasetId = selectedDataSource.id;
        const latColumnName = QueryColumns.getDerivedColumnName(latitudeColumn);
        const lngColumnName =
          QueryColumns.getDerivedColumnName(longitudeColumn);

        console.log("Loading dataset:", datasetId);
        console.log("Lat column:", latColumnName);
        console.log("Lng column:", lngColumnName);

        // Load the dataset into memory
        await DatasetRawDataClient.loadLocalDataset({ datasetId });

        // Convert the dataset to GeoJSON using DuckDB spatial functions
        // We use ST_Point to create points from lat/lng columns
        // and ST_AsGeoJSON to convert to GeoJSON format
        // Note: ST_AsGeoJSON returns a JSON object, which DuckDB will
        // return as a string
        // ST_Point takes (x, y) where x is longitude and y is latitude
        const geojsonQuery = `
          SELECT 
            ST_AsGeoJSON(
              ST_Point(
                CAST("$lngColumnName$" AS DOUBLE),
                CAST("$latColumnName$" AS DOUBLE)
              )
            ) AS geometry,
            *
          FROM "$datasetId$"
          WHERE 
            "$latColumnName$" IS NOT NULL 
            AND "$lngColumnName$" IS NOT NULL
        `;

        console.log("Running GeoJSON query...");
        const queryResult = await DuckDBClient.runRawQuery<{
          geometry: unknown;
          [key: string]: unknown;
        }>(geojsonQuery, {
          params: {
            latColumnName,
            lngColumnName,
            datasetId,
          },
        });

        console.log("Query result rows:", queryResult.data.length);

        // Convert query results to GeoJSON FeatureCollection format
        const features: GeoJSON.Feature[] = queryResult.data
          .map((row) => {
            const { geometry: geometryData, ...properties } = row;

            // ST_AsGeoJSON returns a JSON object, which may be a string or
            // already parsed
            let geometry: GeoJSON.Geometry | null = null;
            try {
              if (typeof geometryData === "string") {
                geometry = JSON.parse(geometryData) as GeoJSON.Geometry;
              } else if (geometryData && typeof geometryData === "object") {
                geometry = geometryData as GeoJSON.Geometry;
              }
            } catch (error) {
              // Skip rows with invalid geometry JSON
              console.warn("Failed to parse geometry:", error);
              return null;
            }

            if (!geometry) {
              return null;
            }

            // Remove geometry and lat/lng columns from properties to avoid
            // duplication
            const cleanProperties: GeoJSON.GeoJsonProperties = {
              ...properties,
            };
            delete cleanProperties[latColumnName];
            delete cleanProperties[lngColumnName];

            const feature: GeoJSON.Feature = {
              type: "Feature",
              geometry,
              properties: cleanProperties,
            };
            return feature;
          })
          .filter((feature): feature is GeoJSON.Feature => {
            return feature !== null;
          });

        console.log("Valid features:", features.length);

        const geojsonData: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features,
        };

        if (features.length === 0) {
          // No features to display
          console.warn("No valid features found in dataset");
          if (map.getLayer(GEOJSON_LAYER_ID)) {
            map.removeLayer(GEOJSON_LAYER_ID);
          }
          if (map.getSource(GEOJSON_SOURCE_ID)) {
            map.removeSource(GEOJSON_SOURCE_ID);
          }
          dataLoadedRef.current = false;
          return;
        }

        // Calculate bounds from GeoJSON features
        const calculateBounds = (
          featureList: GeoJSON.Feature[],
        ): [[number, number], [number, number]] => {
          let minLng = Infinity;
          let minLat = Infinity;
          let maxLng = -Infinity;
          let maxLat = -Infinity;

          featureList.forEach((feature) => {
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

        const featureBounds = calculateBounds(features);

        // Wait for map to be loaded before adding source
        const addSourceAndLayer = () => {
          // Remove existing source and layer if they exist
          if (map.getLayer(GEOJSON_LAYER_ID)) {
            map.removeLayer(GEOJSON_LAYER_ID);
          }
          if (map.getSource(GEOJSON_SOURCE_ID)) {
            map.removeSource(GEOJSON_SOURCE_ID);
          }

          // Add the GeoJSON source
          map.addSource(GEOJSON_SOURCE_ID, {
            type: "geojson",
            data: geojsonData,
          });

          // Add a circle layer to display the points
          map.addLayer({
            id: GEOJSON_LAYER_ID,
            type: "circle",
            source: GEOJSON_SOURCE_ID,
            paint: {
              "circle-radius": 6,
              "circle-color": "#3b82f6",
              "circle-opacity": 0.8,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Add event listeners after layer is created
          map.on("click", GEOJSON_LAYER_ID, handleClick);
          map.on("mouseenter", GEOJSON_LAYER_ID, handleMouseEnter);
          map.on("mouseleave", GEOJSON_LAYER_ID, handleMouseLeave);

          // Recenter map to fit the data bounds
          map.fitBounds(featureBounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 1000,
          });

          // Update initial lat/long and zoom after fitBounds completes
          if (mapViewState) {
            map.once("moveend", () => {
              const center = map.getCenter();
              const zoom = map.getZoom();
              mapViewState.current = {
                latLong: [center.lng, center.lat], // [lng, lat] for MapLibre
                zoom,
              };
            });
          }

          dataLoadedRef.current = true;
          console.log("Map layer added successfully");
        };

        // Check if map is loaded AFTER async operations complete
        // The map might have loaded while we were doing async work
        if (map.loaded()) {
          console.log("trying to add map layer");
          addSourceAndLayer();
        } else {
          // Otherwise wait for map to load
          console.log("waiting to add map layer");
          map.on("load", addSourceAndLayer);
        }
      } catch (error) {
        console.error("Error loading selected data source:", error);
        dataLoadedRef.current = false;
      }
    };

    loadData();

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
              "circle-radius": 6,
              "circle-color": "#3b82f6",
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
        console.log("doing the cleanup");
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
    // we disable exhaustive deps because we want to be more specific on
    // when to trigger a map re-load
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    map,
    mapViewState,
    selectedDataSource?.id,
    latitudeColumn?.baseColumn.id,
    longitudeColumn?.baseColumn.id,
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);
}
