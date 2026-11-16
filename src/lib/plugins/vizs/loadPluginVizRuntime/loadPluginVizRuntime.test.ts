import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    runtime: { runPluginVizTransform: vi.fn() },
    runtimeModuleLoadCount: 0,
    isRuntimeChunkBroken: false,
  };
});

/**
 * Stands in for the runtime chunk. Vitest runs it each time the chunk is
 * imported, so it counts imports and can simulate a chunk that fails to load.
 */
function _makeRuntimeModule(): { PluginVizRuntime: typeof mocks.runtime } {
  mocks.runtimeModuleLoadCount += 1;
  if (mocks.isRuntimeChunkBroken) {
    throw new Error("Failed to fetch dynamically imported module");
  }
  return { PluginVizRuntime: mocks.runtime };
}

/**
 * Imports a fresh copy of the loader, so the runtime it cached in an earlier
 * test cannot leak into this one.
 */
async function _importFreshLoader(): Promise<
  typeof import("@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime").loadPluginVizRuntime
> {
  vi.resetModules();
  vi.doMock(
    "@/lib/plugins/vizs/PluginVizRuntime/PluginVizRuntime",
    _makeRuntimeModule,
  );
  const loaderModule =
    await import("@/lib/plugins/vizs/loadPluginVizRuntime/loadPluginVizRuntime");
  return loaderModule.loadPluginVizRuntime;
}

describe("loadPluginVizRuntime", () => {
  beforeEach(() => {
    mocks.runtimeModuleLoadCount = 0;
    mocks.isRuntimeChunkBroken = false;
  });

  it("does not import the runtime until it is asked to load it", async () => {
    await _importFreshLoader();

    expect(mocks.runtimeModuleLoadCount).toBe(0);
  });

  it("resolves to the runtime the chunk exports", async () => {
    const loadPluginVizRuntime = await _importFreshLoader();

    await expect(loadPluginVizRuntime()).resolves.toBe(mocks.runtime);
  });

  it("reuses the first load across repeated calls", async () => {
    const loadPluginVizRuntime = await _importFreshLoader();
    const firstLoad = loadPluginVizRuntime();
    await firstLoad;

    expect(loadPluginVizRuntime()).toBe(firstLoad);
  });

  it("rejects when the runtime chunk fails to load", async () => {
    mocks.isRuntimeChunkBroken = true;
    const loadPluginVizRuntime = await _importFreshLoader();

    // Vitest wraps an error a mock factory throws and keeps it as the cause.
    await expect(loadPluginVizRuntime()).rejects.toMatchObject({
      cause: { message: "Failed to fetch dynamically imported module" },
    });
  });

  it("imports the runtime chunk again after a failed load", async () => {
    mocks.isRuntimeChunkBroken = true;
    const loadPluginVizRuntime = await _importFreshLoader();
    await loadPluginVizRuntime().catch(() => {});

    mocks.isRuntimeChunkBroken = false;
    await loadPluginVizRuntime();

    expect(mocks.runtimeModuleLoadCount).toBe(2);
  });

  it("resolves to the runtime on a retry after a failed load", async () => {
    mocks.isRuntimeChunkBroken = true;
    const loadPluginVizRuntime = await _importFreshLoader();
    await loadPluginVizRuntime().catch(() => {});

    mocks.isRuntimeChunkBroken = false;

    await expect(loadPluginVizRuntime()).resolves.toBe(mocks.runtime);
  });
});
