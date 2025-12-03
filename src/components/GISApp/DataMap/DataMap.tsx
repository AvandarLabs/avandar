import { Box, Stack } from "@mantine/core";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { QueryColumn } from "@/models/queries/QueryColumn";
import { QueryDataSource } from "@/models/queries/QueryDataSource";
import { applyMapStyles } from "./applyMapStyles";
import { MapStylePicker } from "./MapStylePicker";
import { MapStyleKey, mapStyles } from "./mapStyles";
import { QueryFormContainer } from "./QueryFormContainer/QueryFormContainer";
import { useSelectedMapDataSource } from "./useSelectedMapDataSource";

type MapProps = {
  defaultLatitude?: number;
  defaultLongitude?: number;
  defaultZoom?: number;
};

export function DataMap({
  defaultLatitude = 40.7128,
  defaultLongitude = -74.006,
  defaultZoom = 10,
}: MapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>("avandar");
  const [selectedDataSource, setSelectedDataSource] = useState<
    QueryDataSource | undefined
  >(undefined);
  const [latitudeColumn, setLatitudeColumn] = useState<QueryColumn | undefined>(
    undefined,
  );
  const [longitudeColumn, setLongitudeColumn] = useState<
    QueryColumn | undefined
  >(undefined);
  const [symbolSizeColumn, setSymbolSizeColumn] = useState<
    QueryColumn | undefined
  >(undefined);
  const [symbolColor, setSymbolColor] = useState<string | undefined>(undefined);
  const mapViewState = useRef<{
    latLong: [number, number];
    zoom: number;
  }>({
    latLong: [defaultLongitude, defaultLatitude], // [lng, lat] for MapLibre
    zoom: defaultZoom,
  });

  // Load selected data source on map
  useSelectedMapDataSource({
    map: mapInstance,
    mapViewState,
    selectedDataSource,
    latitudeColumn,
    longitudeColumn,
    symbolSizeColumn,
    symbolColor,
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map: MapLibreMap = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyles[currentStyle].url,
      center: mapViewState.current.latLong,
      zoom: mapViewState.current.zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.resize();
      if (currentStyle === "avandar") {
        applyMapStyles(map);
      }
    });

    mapRef.current = map;
    setMapInstance(map);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [mapViewState, currentStyle]);

  // Handle style changes after map is initialized
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      map.setStyle(mapStyles[currentStyle].url);

      // Apply custom styles when switching to avandar style
      if (currentStyle === "avandar") {
        map.once("style.load", () => {
          applyMapStyles(map);
        });
      }
    }
  }, [currentStyle]);

  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <Box
        pos="absolute"
        style={{
          zIndex: 1,
          left: 8,
          top: 16,
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 12,
          padding: 8,
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow:
            "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
        }}
      >
        <Stack gap="xxxs">
          <MapStylePicker
            mapStyles={mapStyles}
            value={currentStyle}
            onChange={setCurrentStyle}
          />
          <QueryFormContainer
            selectedDataSource={selectedDataSource}
            onSelectedDataSourceChange={setSelectedDataSource}
            latitudeColumn={latitudeColumn}
            onLatitudeColumnChange={setLatitudeColumn}
            longitudeColumn={longitudeColumn}
            onLongitudeColumnChange={setLongitudeColumn}
            symbolSizeColumn={symbolSizeColumn}
            onSymbolSizeColumnChange={setSymbolSizeColumn}
            symbolColor={symbolColor}
            onSymbolColorChange={setSymbolColor}
          />
        </Stack>
      </Box>
    </>
  );
}
