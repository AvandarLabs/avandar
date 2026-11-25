import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadManifestModules } from "@/lib/plugins/loadManifestModules/loadManifestModules";
import { Logger } from "@/utils/Logger";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

vi.mock("@/utils/Logger", () => {
  return { Logger: { error: vi.fn() } };
});

const LOAD_ERROR = new Error("chunk failed to load");

function _makeManifestModule(pluginId: string): PluginManifestModule {
  return { manifest: { id: pluginId }, strings: {} } as PluginManifestModule;
}

function _makeLoadedEntry(pluginId: string): PluginIndexEntry {
  return {
    id: pluginId,
    loadManifest: vi.fn().mockResolvedValue(_makeManifestModule(pluginId)),
    loadCode: vi.fn(),
  };
}

function _makeFailingEntry(pluginId: string): PluginIndexEntry {
  return {
    id: pluginId,
    loadManifest: vi.fn().mockRejectedValue(LOAD_ERROR),
    loadCode: vi.fn(),
  };
}

describe("loadManifestModules", () => {
  beforeEach(() => {
    vi.mocked(Logger.error).mockClear();
  });

  it("returns every manifest module when all of them load", async () => {
    const entries = [
      _makeLoadedEntry("test.all-load.a"),
      _makeLoadedEntry("test.all-load.b"),
    ];

    const { manifestModules } = await loadManifestModules({ entries });

    expect(
      manifestModules.map(({ manifest }) => {
        return manifest.id;
      }),
    ).toEqual(["test.all-load.a", "test.all-load.b"]);
  });

  it("reports no failures when every manifest loads", async () => {
    const { hasFailures } = await loadManifestModules({
      entries: [_makeLoadedEntry("test.no-failure.a")],
    });

    expect(hasFailures).toBe(false);
  });

  it("still returns the other manifests when one fails to load", async () => {
    const entries = [
      _makeLoadedEntry("test.one-fails.a"),
      _makeFailingEntry("test.one-fails.b"),
      _makeLoadedEntry("test.one-fails.c"),
    ];

    const { manifestModules } = await loadManifestModules({ entries });

    expect(
      manifestModules.map(({ manifest }) => {
        return manifest.id;
      }),
    ).toEqual(["test.one-fails.a", "test.one-fails.c"]);
  });

  it("reports a failure when one manifest fails to load", async () => {
    const { hasFailures } = await loadManifestModules({
      entries: [
        _makeLoadedEntry("test.reports-failure.a"),
        _makeFailingEntry("test.reports-failure.b"),
      ],
    });

    expect(hasFailures).toBe(true);
  });

  it("logs the plugin id and error of a manifest that fails to load", async () => {
    await loadManifestModules({
      entries: [_makeFailingEntry("test.logs-failure.a")],
    });

    expect(Logger.error).toHaveBeenCalledWith(
      "Plugin manifest failed to load",
      { pluginId: "test.logs-failure.a", error: LOAD_ERROR },
    );
  });

  it("returns no modules and no failures for no entries", async () => {
    const result = await loadManifestModules({ entries: [] });

    expect(result).toEqual({ manifestModules: [], hasFailures: false });
  });
});
