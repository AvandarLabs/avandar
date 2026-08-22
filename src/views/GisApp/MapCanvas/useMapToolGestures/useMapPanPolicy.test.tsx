/**
 * Alt-pan and tool cursor: drag-pan is off unless Select or Alt is active.
 */
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/test-utils";
import { useMapPanPolicy } from "@/views/GisApp/MapCanvas/useMapToolGestures/useMapPanPolicy";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/annotateMapToolHarness";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { ReactNode } from "react";

function PanPolicyHarness(options: {
  fakeMap: ReturnType<typeof createFakeMap>;
  mapToolMode: MapToolMode;
}): ReactNode {
  const { fakeMap, mapToolMode } = options;
  const [mapRef] = useState(() => {
    return { current: fakeMap.map };
  });
  useMapPanPolicy({ mapRef, mapToolMode });
  return null;
}

describe("useMapPanPolicy", () => {
  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
  });

  it("disables drag-pan and uses a crosshair when Area is armed", () => {
    const fakeMap = createFakeMap();
    render(
      <PanPolicyHarness fakeMap={fakeMap} mapToolMode={{ type: "aoi" }} />,
    );
    expect(fakeMap.dragPan.disable).toHaveBeenCalled();
    expect(fakeMap.map.doubleClickZoom.disable).toHaveBeenCalled();
    expect(fakeMap.map.getCanvas().style.cursor).toBe("crosshair");
  });

  it("temporarily pans while Alt is held on a drawing tool", () => {
    const fakeMap = createFakeMap();
    render(
      <PanPolicyHarness fakeMap={fakeMap} mapToolMode={{ type: "aoi" }} />,
    );
    fakeMap.dragPan.enable.mockClear();
    fakeMap.dragPan.disable.mockClear();
    fireEvent.keyDown(window, { key: "Alt", altKey: true });
    expect(fakeMap.dragPan.enable).toHaveBeenCalled();
    expect(fakeMap.map.getCanvas().style.cursor).toBe("grab");
    fireEvent.keyUp(window, { key: "Alt", altKey: false });
    expect(fakeMap.dragPan.disable).toHaveBeenCalled();
    expect(fakeMap.map.getCanvas().style.cursor).toBe("crosshair");
  });

  it("disables shift-drag box zoom while a drawing tool is armed", () => {
    const fakeMap = createFakeMap();
    render(
      <PanPolicyHarness
        fakeMap={fakeMap}
        mapToolMode={{ type: "annotate", kind: "area" }}
      />,
    );
    expect(fakeMap.map.boxZoom.disable).toHaveBeenCalled();
    expect(fakeMap.map.boxZoom.enable).not.toHaveBeenCalled();
  });

  it("keeps drag-pan enabled on Select", () => {
    const fakeMap = createFakeMap();
    render(
      <PanPolicyHarness fakeMap={fakeMap} mapToolMode={{ type: "pan" }} />,
    );
    expect(fakeMap.dragPan.enable).toHaveBeenCalled();
    expect(fakeMap.map.boxZoom.enable).toHaveBeenCalled();
    expect(fakeMap.map.getCanvas().style.cursor).toBe("grab");
  });
});
