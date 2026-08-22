import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapSpec } from "@/views/GisApp/layers/makeMapSpecFromLayerSpecs/MapSpec.types";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

import maplibregl from "maplibre-gl";

import { syncMap } from "@/views/GisApp/MapCanvas/syncMap/syncMap";

/** How long the offscreen map may take to reach idle, in milliseconds. */
const IDLE_TIMEOUT_MS = 15_000;

/** The state applied before the export spec, so `syncMap` adds everything. */
const EMPTY_EXPORT_SPEC: MapSpec = { sources: {}, layers: [] };

/** Creates the detached, offscreen container the export map renders into. */
function _createOffscreenContainer(
  mapCanvasPx: Readonly<{ width: number; height: number }>,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${mapCanvasPx.width}px`;
  container.style.height = `${mapCanvasPx.height}px`;
  document.body.appendChild(container);
  return container;
}

/**
 * Copies a live canvas's pixels into a new, detached canvas of the same
 * size, so the result survives `map.remove()` tearing down the source.
 */
function _copyCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement("canvas");
  copy.width = source.width;
  copy.height = source.height;
  const context = copy.getContext("2d");
  if (!context) {
    throw new Error("The export map rendered blank");
  }
  context.drawImage(source, 0, 0);
  return copy;
}

/**
 * Whether a canvas's pixels are uniformly transparent or uniformly black.
 *
 * Either is what a MapLibre canvas looks like when nothing actually drew:
 * transparent is the untouched buffer, black is what some GPU drivers clear
 * a lost or unrendered WebGL context to.
 */
function _isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext("2d");
  if (!context) {
    return true;
  }
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let isUniformlyTransparent = true;
  let isUniformlyBlack = true;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha !== 0) {
      isUniformlyTransparent = false;
    }
    const isOpaqueBlack =
      data[index] === 0 &&
      data[index + 1] === 0 &&
      data[index + 2] === 0 &&
      alpha === 255;
    if (!isOpaqueBlack) {
      isUniformlyBlack = false;
    }
    if (!isUniformlyTransparent && !isUniformlyBlack) {
      return false;
    }
  }
  return isUniformlyTransparent || isUniformlyBlack;
}

/**
 * Waits for the map to reach `idle`, rejecting instead on a stuck render or a
 * lost WebGL context.
 */
function _waitForRenderOutcome(map: MapLibreMap): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("The export map did not finish rendering"));
    }, IDLE_TIMEOUT_MS);

    map.once("idle", () => {
      clearTimeout(timeoutId);
      resolve();
    });

    map.once("webglcontextlost", () => {
      clearTimeout(timeoutId);
      reject(new Error("The export map rendered blank"));
    });
  });
}

/**
 * Renders the export spec on a second, offscreen MapLibre map and returns its
 * canvas.
 *
 * A blank canvas, a lost WebGL context, or an idle timeout rejects rather
 * than resolving. A PDF with a black or empty map frame is worse than no
 * PDF: it is a sitrep that looks like it says something while saying
 * nothing. The camera is set once, in the map constructor, so there is never
 * a flight; this also means reduced motion needs no special handling.
 *
 * @param options.spec The chrome-free spec from `makeExportMapSpec`.
 * @param options.styleUrl The authored basemap style, applied as-is.
 * @param options.view The camera to render, applied as a jump.
 * @param options.mapCanvasPx The map frame size in pixels at export dpi.
 * @returns A canvas detached from the offscreen map, safe to use after the
 * map and its container are torn down.
 * @throws When the map does not reach idle, renders blank, or loses its
 * WebGL context.
 */
export async function captureExportMapCanvas(
  options: Readonly<{
    spec: MapSpec;
    styleUrl: string | StyleSpecification;
    view: AvaMapConfig.ViewState;
    mapCanvasPx: { width: number; height: number };
  }>,
): Promise<HTMLCanvasElement> {
  const { spec, styleUrl, view, mapCanvasPx } = options;
  const container = _createOffscreenContainer(mapCanvasPx);
  const map = new maplibregl.Map({
    container,
    style: styleUrl,
    center: view.center,
    zoom: view.zoom,
    canvasContextAttributes: { preserveDrawingBuffer: true },
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
  });

  try {
    map.on("style.load", () => {
      syncMap({ map, previousSpec: EMPTY_EXPORT_SPEC, nextSpec: spec });
    });

    await _waitForRenderOutcome(map);

    const canvas = _copyCanvas(map.getCanvas());
    if (_isCanvasBlank(canvas)) {
      throw new Error("The export map rendered blank");
    }
    return canvas;
  } finally {
    map.remove();
    container.remove();
  }
}
