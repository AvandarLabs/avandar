import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

/**
 * Shared map-tool harnesses for MapToolCluster tests.
 */
import { useRef, useState } from "react";

import { useMapToolGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/useMapToolGestures";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/createFakeMap";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";

type HarnessProps = {
  updateConfig: (update: (current: AvaMapConfig.T) => AvaMapConfig.T) => void;
  fakeMap: ReturnType<typeof createFakeMap>;
};

export function AreaToolHarness({
  updateConfig,
  fakeMap,
}: HarnessProps): ReactNode {
  const [mapToolMode, setMapToolMode] = useState<MapToolMode>({ type: "pan" });
  const mapRef = useRef(fakeMap.map);
  const { invalidRingStatus } = useMapToolGestures({
    mapRef,
    mapToolMode,
    onMapToolModeChange: setMapToolMode,
    updateConfig,
  });
  return (
    <>
      {invalidRingStatus ? <div role="status">{invalidRingStatus}</div> : null}
      <MapToolCluster
        mapToolMode={mapToolMode}
        onMapToolModeChange={setMapToolMode}
      />
    </>
  );
}

export function MeasureToolHarness({
  updateConfig,
  fakeMap,
}: HarnessProps): ReactNode {
  const [mapToolMode, setMapToolMode] = useState<MapToolMode>({ type: "pan" });
  const mapRef = useRef(fakeMap.map);
  const { measureVertices } = useMapToolGestures({
    mapRef,
    mapToolMode,
    onMapToolModeChange: setMapToolMode,
    updateConfig,
  });
  return (
    <MapToolCluster
      mapToolMode={mapToolMode}
      onMapToolModeChange={setMapToolMode}
      measureVertices={measureVertices}
    />
  );
}
