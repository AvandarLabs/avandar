import { setWorkerUrl } from "maplibre-gl";
import workerSource from "maplibre-gl/dist/maplibre-gl-worker.mjs?raw";

/**
 * Points MapLibre at its worker for film bundles.
 *
 * MapLibre 6 finds its worker from `import.meta.url`, which the film build
 * replaces with an empty object, so the worker never loads on its own. The
 * worker is a single self-contained module, so its source is inlined at build
 * time and served from a same-origin Blob URL instead.
 */
setWorkerUrl(
  URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })),
);
