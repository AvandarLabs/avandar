import { MapLayerMouseEvent, Map as MapLibreMap } from "maplibre-gl";
import { RefObject, useEffect, useRef } from "react";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { isOfModelType } from "@/lib/utils/guards/guards";
import { QueryColumn } from "@/models/queries/QueryColumn";
import { QueryColumns } from "@/models/queries/QueryColumn/QueryColumns";
import { QueryDataSource } from "@/models/queries/QueryDataSource";

const GEOJSON_SOURCE_ID = "selected-datasource-source";
const GEOJSON_LAYER_ID = "selected-datasource-layer";
const HIGHLIGHT_LAYER_ID = "selected-datasource-highlight-layer";

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
  symbolSizeColumn?: QueryColumn;
  symbolColor?: string;
  selectedFeature?: GeoJSON.Feature | null;
  onFeatureClick?: (feature: GeoJSON.Feature) => void;
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
  symbolSizeColumn,
  symbolColor,
  selectedFeature,
  onFeatureClick,
}: UseSelectedMapDataSourceOptions): void {
  const dataLoadedRef = useRef(false);
  const previousDataSourceIdRef = useRef<string | undefined>(undefined);

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
      previousDataSourceIdRef.current = undefined;
      return;
    }

    // Track current data source ID for cleanup comparison
    const currentDataSourceId = selectedDataSource.id;

    // If only symbolSizeColumn or symbolColor changed and layer exists,
    // update paint property
    if (
      dataLoadedRef.current &&
      map.getLayer(GEOJSON_LAYER_ID) &&
      map.getSource(GEOJSON_SOURCE_ID) &&
      previousDataSourceIdRef.current === currentDataSourceId
    ) {
      const symbolSizeColumnName =
        symbolSizeColumn ?
          QueryColumns.getDerivedColumnName(symbolSizeColumn)
        : undefined;

      const circleRadius =
        symbolSizeColumnName ?
          ([
            "coalesce",
            [
              "*",
              ["+", ["to-number", ["get", symbolSizeColumnName]], 1],
              3, // 3 * (value + 1): value 1 = 6, then +3 per unit
            ],
            6, // Default fallback
          ] as unknown as number)
        : 6;

      const circleColor = symbolColor ?? "#3b82f6";

      try {
        map.setPaintProperty(GEOJSON_LAYER_ID, "circle-radius", circleRadius);
        map.setPaintProperty(GEOJSON_LAYER_ID, "circle-color", circleColor);
        console.log("Updated circle radius and color paint properties");
        return;
      } catch (error) {
        console.error("Error updating circle paint properties:", error);
        // Fall through to reload if update fails
      }
    }

    // Handle click events on the layer
    const handleClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature || !feature.properties) {
        return;
      }

      // Call the onFeatureClick callback if provided
      if (onFeatureClick) {
        onFeatureClick(feature as GeoJSON.Feature);
      }
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
        const symbolSizeColumnName =
          symbolSizeColumn ?
            QueryColumns.getDerivedColumnName(symbolSizeColumn)
          : undefined;

        console.log("Loading dataset:", datasetId);
        console.log("Lat column:", latColumnName);
        console.log("Lng column:", lngColumnName);
        console.log("Symbol size column:", symbolSizeColumnName);

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
          .map((row, index) => {
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
            // duplication, but keep symbolSizeColumn for styling
            const cleanProperties: GeoJSON.GeoJsonProperties = {
              ...properties,
            };
            delete cleanProperties[latColumnName];
            delete cleanProperties[lngColumnName];
            // Note: symbolSizeColumnName kept in properties for styling

            // Add a unique feature ID for highlighting
            // Use index and coordinates as a unique identifier
            const coordinates =
              geometry.type === "Point" ? geometry.coordinates : [];
            const featureId = `feature_${index}_${JSON.stringify(coordinates)}`;
            cleanProperties._featureId = featureId;

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
          // Use data-driven styling for circle radius if symbolSizeColumn set
          const circleRadius =
            symbolSizeColumnName ?
              ([
                "coalesce",
                [
                  "*",
                  ["+", ["to-number", ["get", symbolSizeColumnName]], 1],
                  3, // 3 * (value + 1): value 1 = 6, then +3 per unit
                ],
                6, // Default fallback
              ] as unknown as number)
            : 6;

          const circleColor = symbolColor ?? "#3b82f6";

          map.addLayer({
            id: GEOJSON_LAYER_ID,
            type: "circle",
            source: GEOJSON_SOURCE_ID,
            paint: {
              "circle-radius": circleRadius,
              "circle-color": circleColor,
              "circle-opacity": 0.8,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Add event listeners after layer is created
          map.on("click", GEOJSON_LAYER_ID, handleClick);
          map.on("mouseenter", GEOJSON_LAYER_ID, handleMouseEnter);
          map.on("mouseleave", GEOJSON_LAYER_ID, handleMouseLeave);

          // Add highlight layer (initially hidden)
          // This layer shows the selected feature with a thick yellow border
          if (!map.getLayer(HIGHLIGHT_LAYER_ID)) {
            map.addLayer({
              id: HIGHLIGHT_LAYER_ID,
              type: "circle",
              source: GEOJSON_SOURCE_ID,
              paint: {
                "circle-radius": circleRadius, // Same radius as base layer
                "circle-color": circleColor, // Same color as base layer
                "circle-opacity": 0.8, // Same opacity as base layer
                "circle-stroke-width": 5, // Thick yellow border
                "circle-stroke-color": "#ffd700", // Yellow highlight border
              },
              filter: ["==", "_featureId", ""], // Initially filter out all features
            });
          }

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

        // Update the ref after data is successfully loaded
        previousDataSourceIdRef.current = currentDataSourceId;

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
          const symbolSizeColumnName =
            symbolSizeColumn ?
              QueryColumns.getDerivedColumnName(symbolSizeColumn)
            : undefined;

          const circleRadius =
            symbolSizeColumnName ?
              ([
                "coalesce",
                [
                  "*",
                  ["+", ["to-number", ["get", symbolSizeColumnName]], 1],
                  3, // 3 * (value + 1): value 1 = 6, then +3 per unit
                ],
                6, // Default fallback
              ] as unknown as number)
            : 6;

          const circleColor = symbolColor ?? "#3b82f6";

          map.addLayer({
            id: GEOJSON_LAYER_ID,
            type: "circle",
            source: GEOJSON_SOURCE_ID,
            paint: {
              "circle-radius": circleRadius,
              "circle-color": circleColor,
              "circle-opacity": 0.8,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Add highlight layer (initially hidden)
          // This layer shows the selected feature with a thick yellow border
          if (!map.getLayer(HIGHLIGHT_LAYER_ID)) {
            map.addLayer({
              id: HIGHLIGHT_LAYER_ID,
              type: "circle",
              source: GEOJSON_SOURCE_ID,
              paint: {
                "circle-radius": circleRadius, // Same radius as base layer
                "circle-color": circleColor, // Same color as base layer
                "circle-opacity": 0.8, // Same opacity as base layer
                "circle-stroke-width": 5, // Thick yellow border
                "circle-stroke-color": "#ffd700", // Yellow highlight border
              },
              filter: ["==", "_featureId", ""], // Initially filter out all features
            });
          }
        }
      }
    };

    map.on("style.load", handleStyleData);

    return () => {
      try {
        // Only cleanup if data source changed
        const shouldCleanup =
          !selectedDataSource ||
          previousDataSourceIdRef.current !== selectedDataSource?.id;

        if (shouldCleanup) {
          console.log("doing the cleanup - data source changed");
          // Cleanup: remove event listeners
          map.off("click", GEOJSON_LAYER_ID, handleClick);
          map.off("mouseenter", GEOJSON_LAYER_ID, handleMouseEnter);
          map.off("mouseleave", GEOJSON_LAYER_ID, handleMouseLeave);
          map.off("style.load", handleStyleData);

          // Cleanup: remove layers and source
          if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
            map.removeLayer(HIGHLIGHT_LAYER_ID);
          }
          if (map.getLayer(GEOJSON_LAYER_ID)) {
            map.removeLayer(GEOJSON_LAYER_ID);
          }
          if (map.getSource(GEOJSON_SOURCE_ID)) {
            map.removeSource(GEOJSON_SOURCE_ID);
          }
        } else {
          console.log("skipping cleanup - data source unchanged");
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
    symbolSizeColumn?.baseColumn.id,
    symbolColor,
    selectedFeature,
    onFeatureClick,
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  // Separate effect to handle feature highlighting
  useEffect(() => {
    if (!map || !map.getSource(GEOJSON_SOURCE_ID)) {
      return;
    }

    const updateHighlight = () => {
      if (!map.getLayer(HIGHLIGHT_LAYER_ID)) {
        return;
      }

      if (selectedFeature?.properties?._featureId) {
        // Show the selected feature
        const featureId = selectedFeature.properties._featureId as string;
        map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "_featureId", featureId]);
      } else {
        // Hide all features (filter out everything)
        map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "_featureId", ""]);
      }
    };

    // Wait for map to be ready
    if (map.loaded()) {
      updateHighlight();
    } else {
      map.once("load", updateHighlight);
    }

    return () => {
      // Cleanup: remove highlight when component unmounts or feature changes
      try {
        if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
          map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "_featureId", ""]);
        }
      } catch (error) {
        // Ignore errors during cleanup
        console.warn("Error cleaning up highlight:", error);
      }
    };
  }, [map, selectedFeature]);
}
