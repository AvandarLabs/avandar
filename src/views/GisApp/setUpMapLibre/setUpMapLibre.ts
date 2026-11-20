/**
 * One-time MapLibre setup for every surface that renders a map: its
 * stylesheet, and the URL of the worker that parses tiles off the main
 * thread.
 *
 * MapLibre 6 ships as ES modules only and cannot locate its own worker
 * inside a bundle, so the worker is emitted through Vite's `?worker&url`
 * query and handed to MapLibre before any map is created. Import this module
 * for its side effects from a map surface's entry component.
 */
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(workerUrl);
