import { afterEach, describe, expect, it, vi } from "vitest";
import { attachPlaceGestures } from "@/views/GisApp/MapCanvas/useMapToolGestures/attachPlaceGestures/attachPlaceGestures";
import { createFakeMap } from "@/views/GisApp/shell/MapToolCluster/createFakeMap";

function _attach(): {
  fakeMap: ReturnType<typeof createFakeMap>;
  onPlacePicked: ReturnType<typeof vi.fn>;
  onMapToolModeChange: ReturnType<typeof vi.fn>;
  detach: () => void;
} {
  const fakeMap = createFakeMap();
  const onPlacePicked = vi.fn();
  const onMapToolModeChange = vi.fn();
  const detach = attachPlaceGestures(fakeMap.map, {
    onPlacePicked,
    onMapToolModeChange,
  });
  return { fakeMap, onPlacePicked, onMapToolModeChange, detach };
}

describe("attachPlaceGestures", () => {
  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
  });

  it("picks the clicked point and returns to Pan", () => {
    const { fakeMap, onPlacePicked, onMapToolModeChange } = _attach();
    fakeMap.emitClick(-73.9885, 40.7603);
    expect(onPlacePicked).toHaveBeenCalledWith({
      latitude: 40.7603,
      longitude: -73.9885,
    });
    expect(onMapToolModeChange).toHaveBeenCalledWith({ type: "pan" });
  });

  it("returns to Pan on Escape without picking a point", () => {
    const { onPlacePicked, onMapToolModeChange } = _attach();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onMapToolModeChange).toHaveBeenCalledWith({ type: "pan" });
    expect(onPlacePicked).not.toHaveBeenCalled();
  });

  it("stops listening for clicks once detached", () => {
    const { fakeMap, detach } = _attach();
    detach();
    expect(fakeMap.map.off).toHaveBeenCalledWith("click", expect.any(Function));
  });
});
