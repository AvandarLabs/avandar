import { describe, expect, it, vi } from "vitest";

const { setWorkerUrlMock } = vi.hoisted(() => {
  return { setWorkerUrlMock: vi.fn() };
});

vi.mock("maplibre-gl", () => {
  return { setWorkerUrl: setWorkerUrlMock };
});
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => {
  return {};
});
vi.mock("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url", () => {
  return { default: "/assets/maplibre-gl-worker.mjs" };
});

describe("setUpMapLibre", () => {
  it("points MapLibre at the Vite-bundled worker on import", async () => {
    await import("@/views/GisApp/setUpMapLibre/setUpMapLibre");

    expect(setWorkerUrlMock).toHaveBeenCalledWith(
      "/assets/maplibre-gl-worker.mjs",
    );
  });
});
