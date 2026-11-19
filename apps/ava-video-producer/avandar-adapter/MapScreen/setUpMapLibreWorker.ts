/**
 * Points MapLibre at its worker for film bundles. `MapScreen` imports this
 * module for its side effect before it creates its map.
 *
 * MapLibre 6 finds its worker from `import.meta.url`, which the film build
 * replaces with an empty object, so the worker never loads on its own. The
 * worker is a single self-contained module, so its source is inlined at build
 * time and served from a same-origin Blob URL instead.
 */
import { setWorkerUrl } from "maplibre-gl";
import workerSource from "maplibre-gl/dist/maplibre-gl-worker.mjs?raw";

// The URL is never revoked on purpose: MapLibre starts a worker from it each
// time a map is created, so it must stay valid for the page's lifetime.
setWorkerUrl(
  URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })),
);
