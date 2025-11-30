import { Box } from "@mantine/core";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { applyMapStyles } from "./applyMapStyles";
import { MapStylePicker } from "./MapStylePicker";
import { MapStyleKey, mapStyles } from "./mapStyles";
import { QueryFormContainer } from "./QueryFormContainer";

type MapProps = {
  initialLongitude?: number;
  initialLatitude?: number;
  initialZoom?: number;
};

export function DataMap({
  initialLongitude = -74.006,
  initialLatitude = 40.7128,
  initialZoom = 10,
}: MapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>("avandar");

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map: MapLibreMap = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyles[currentStyle].url,
      center: [initialLongitude, initialLatitude],
      zoom: initialZoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.resize();
      if (currentStyle === "avandar") {
        applyMapStyles(map);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialLongitude, initialLatitude, initialZoom, currentStyle]);

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
      <Box pos="absolute" top="md" left="md" style={{ zIndex: 1 }}>
        <MapStylePicker
          mapStyles={mapStyles}
          value={currentStyle}
          onChange={(value) => {
            setCurrentStyle(value as MapStyleKey);
          }}
        />
        <QueryFormContainer />
      </Box>
    </>
  );
}
