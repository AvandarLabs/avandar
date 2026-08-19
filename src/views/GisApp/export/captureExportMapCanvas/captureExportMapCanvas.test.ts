import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";

/** How long the module under test waits before declaring the map stuck. */
const IDLE_TIMEOUT_MS = 15_000;

const {
  canvasPixelStateRef,
  getConstructorOptions,
  mapConstructorMock,
  mapMock,
  triggerIdle,
  triggerStyleLoad,
  triggerWebglContextLost,
} = vi.hoisted(() => {
  const state = { isBlank: false };
  let capturedOptions: Record<string, unknown> | undefined;
  const handlers: Record<string, Array<() => void>> = {};

  const registerHandler = (eventName: string, handler: () => void): void => {
    (handlers[eventName] ??= []).push(handler);
  };

  const fakeMap = {
    on: vi.fn(registerHandler),
    once: vi.fn(registerHandler),
    remove: vi.fn(),
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    getCanvas: vi.fn(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1200;
      return canvas;
    }),
  };

  const constructorMock = vi.fn((options: Record<string, unknown>) => {
    capturedOptions = options;
    return fakeMap;
  });

  return {
    canvasPixelStateRef: state,
    getConstructorOptions: () => {
      return capturedOptions as Record<string, unknown>;
    },
    mapConstructorMock: constructorMock,
    mapMock: fakeMap,
    triggerIdle: () => {
      handlers.idle?.forEach((handler) => {
        handler();
      });
    },
    triggerStyleLoad: () => {
      handlers["style.load"]?.forEach((handler) => {
        handler();
      });
    },
    triggerWebglContextLost: () => {
      handlers.webglcontextlost?.forEach((handler) => {
        handler();
      });
    },
  };
});

vi.mock("maplibre-gl", () => {
  return {
    default: { Map: mapConstructorMock },
  };
});

vi.mock("@/views/GisApp/MapCanvas/syncMap/syncMap", () => {
  return { syncMap: vi.fn() };
});

const { captureExportMapCanvas } =
  await import("@/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas");

/** A minimal, valid export spec: no sources or layers. */
function _spec(): MapSpec {
  return { sources: {}, layers: [] };
}

/** Fills a fake 2D context's `getImageData`, since jsdom has no canvas. */
function _installCanvasContextMock(): void {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(function (this: HTMLCanvasElement) {
      return {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => {
          const length = this.width * this.height * 4;
          const data = new Uint8ClampedArray(length);
          if (!canvasPixelStateRef.isBlank) {
            for (let index = 0; index < length; index += 4) {
              data[index] = 100;
              data[index + 1] = 150;
              data[index + 2] = 200;
              data[index + 3] = 255;
            }
          }
          return { data };
        }),
      };
    }),
  });
}

/** Starts a capture without resolving any of its races. */
function _startCapture(
  overrides?: Readonly<{ mapCanvasPx?: { width: number; height: number } }>,
): Promise<HTMLCanvasElement> {
  return captureExportMapCanvas({
    spec: _spec(),
    styleUrl: "https://example.com/style.json",
    view: { center: [-74.006, 40.7128], zoom: 10 },
    mapCanvasPx: overrides?.mapCanvasPx ?? { width: 1800, height: 1200 },
  });
}

/** Runs a capture through style load and idle, to a successful resolution. */
async function _capture(
  overrides?: Readonly<{ mapCanvasPx?: { width: number; height: number } }>,
): Promise<HTMLCanvasElement> {
  const promise = _startCapture(overrides);
  triggerStyleLoad();
  triggerIdle();
  return promise;
}

describe("captureExportMapCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvasPixelStateRef.isBlank = false;
    _installCanvasContextMock();
  });

  it("requests a preserved drawing buffer", async () => {
    await _capture();

    expect(
      (
        getConstructorOptions().canvasContextAttributes as Readonly<{
          preserveDrawingBuffer: boolean;
        }>
      ).preserveDrawingBuffer,
    ).toBe(true);
  });

  it("sizes the container to the export map frame", async () => {
    await _capture({ mapCanvasPx: { width: 1800, height: 1200 } });

    const container = getConstructorOptions().container as HTMLDivElement;
    expect(container.style.width).toBe("1800px");
    expect(container.style.height).toBe("1200px");
  });

  it("jumps to the view without a flight", async () => {
    await _capture();

    expect(mapMock.flyTo).not.toHaveBeenCalled();
    expect(mapMock.easeTo).not.toHaveBeenCalled();
    expect(getConstructorOptions().center).toEqual([-74.006, 40.7128]);
  });

  it("rejects when the map never reaches idle", async () => {
    vi.useFakeTimers();
    try {
      const promise = _startCapture();
      triggerStyleLoad();
      const assertion = expect(promise).rejects.toThrow(
        "The export map did not finish rendering",
      );
      await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects on a blank canvas rather than returning one", async () => {
    canvasPixelStateRef.isBlank = true;

    await expect(_capture()).rejects.toThrow("The export map rendered blank");
  });

  it("rejects when the WebGL context is lost", async () => {
    const promise = _startCapture();
    triggerStyleLoad();
    triggerWebglContextLost();

    await expect(promise).rejects.toThrow("The export map rendered blank");
  });

  it("removes the map and its container on success", async () => {
    const promise = _capture();
    const container = getConstructorOptions().container as HTMLDivElement;
    await promise;

    expect(mapMock.remove).toHaveBeenCalled();
    expect(document.body.contains(container)).toBe(false);
  });

  it("removes the map and its container on failure", async () => {
    canvasPixelStateRef.isBlank = true;
    await _capture().catch(() => {});
    const container = getConstructorOptions().container as HTMLDivElement;

    expect(mapMock.remove).toHaveBeenCalled();
    expect(document.body.contains(container)).toBe(false);
  });

  it("returns a canvas detached from the live map instance", async () => {
    const canvas = await _capture();

    expect(canvas).not.toBe(mapMock.getCanvas());
    expect(canvas.width).toBe(1800);
    expect(canvas.height).toBe(1200);
  });
});
