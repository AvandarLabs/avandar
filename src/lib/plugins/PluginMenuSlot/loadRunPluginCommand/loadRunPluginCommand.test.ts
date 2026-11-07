import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    runPluginCommand: vi.fn(),
    runnerModuleLoadCount: 0,
    isRunnerChunkBroken: false,
  };
});

/**
 * Stands in for the runner chunk. Vitest runs it each time the chunk is
 * imported, so it counts imports and can simulate a chunk that fails to load.
 */
function _makeRunnerModule(): {
  runPluginCommand: typeof mocks.runPluginCommand;
} {
  mocks.runnerModuleLoadCount += 1;
  if (mocks.isRunnerChunkBroken) {
    throw new Error("Failed to fetch dynamically imported module");
  }
  return { runPluginCommand: mocks.runPluginCommand };
}

/**
 * Imports a fresh copy of the loader, so the runner it cached in an earlier
 * test cannot leak into this one.
 */
async function _importFreshLoader(): Promise<
  typeof import("@/lib/plugins/PluginMenuSlot/loadRunPluginCommand/loadRunPluginCommand").loadRunPluginCommand
> {
  vi.resetModules();
  vi.doMock(
    "@/lib/plugins/runPluginCommand/runPluginCommand",
    _makeRunnerModule,
  );
  const loaderModule =
    await import("@/lib/plugins/PluginMenuSlot/loadRunPluginCommand/loadRunPluginCommand");
  return loaderModule.loadRunPluginCommand;
}

describe("loadRunPluginCommand", () => {
  beforeEach(() => {
    mocks.runnerModuleLoadCount = 0;
    mocks.isRunnerChunkBroken = false;
  });

  it("does not import the runner until it is asked to load it", async () => {
    await _importFreshLoader();

    expect(mocks.runnerModuleLoadCount).toBe(0);
  });

  it("resolves to the runner the chunk exports", async () => {
    const loadRunPluginCommand = await _importFreshLoader();

    await expect(loadRunPluginCommand()).resolves.toBe(mocks.runPluginCommand);
  });

  it("reuses the first load across repeated calls", async () => {
    const loadRunPluginCommand = await _importFreshLoader();
    const firstLoad = loadRunPluginCommand();
    await firstLoad;

    expect(loadRunPluginCommand()).toBe(firstLoad);
  });

  it("rejects when the runner chunk fails to load", async () => {
    mocks.isRunnerChunkBroken = true;
    const loadRunPluginCommand = await _importFreshLoader();

    // Vitest wraps an error a mock factory throws and keeps it as the cause.
    await expect(loadRunPluginCommand()).rejects.toMatchObject({
      cause: { message: "Failed to fetch dynamically imported module" },
    });
  });

  it("imports the runner chunk again after a failed load", async () => {
    mocks.isRunnerChunkBroken = true;
    const loadRunPluginCommand = await _importFreshLoader();
    await loadRunPluginCommand().catch(() => {});

    mocks.isRunnerChunkBroken = false;
    await loadRunPluginCommand();

    expect(mocks.runnerModuleLoadCount).toBe(2);
  });

  it("resolves to the runner on a retry after a failed load", async () => {
    mocks.isRunnerChunkBroken = true;
    const loadRunPluginCommand = await _importFreshLoader();
    await loadRunPluginCommand().catch(() => {});

    mocks.isRunnerChunkBroken = false;

    await expect(loadRunPluginCommand()).resolves.toBe(mocks.runPluginCommand);
  });
});
