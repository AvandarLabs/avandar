import { describe, expect, it, vi } from "vitest";
import { makePluginModuleCache } from "@/lib/plugins/makePluginModuleCache/makePluginModuleCache";
import type {
  PluginCodeModule,
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

const CODE_MODULE = { definition: {}, messages: {} } as PluginCodeModule;
const MANIFEST_MODULE = { manifest: {}, strings: {} } as PluginManifestModule;

function _makeEntry(options: {
  loadCode?: PluginIndexEntry["loadCode"];
  loadManifest?: PluginIndexEntry["loadManifest"];
}): PluginIndexEntry {
  return {
    id: "avandar.test",
    loadCode: options.loadCode ?? vi.fn(),
    loadManifest: options.loadManifest ?? vi.fn(),
  };
}

describe("makePluginModuleCache", () => {
  it("calls an entry's loadCode once across repeated loads", async () => {
    const loadCode = vi.fn().mockResolvedValue(CODE_MODULE);
    const cache = makePluginModuleCache();
    const entry = _makeEntry({ loadCode });

    await cache.loadCode(entry);
    await cache.loadCode(entry);

    expect(loadCode).toHaveBeenCalledTimes(1);
  });

  it("calls an entry's loadManifest once across repeated loads", async () => {
    const loadManifest = vi.fn().mockResolvedValue(MANIFEST_MODULE);
    const cache = makePluginModuleCache();
    const entry = _makeEntry({ loadManifest });

    await cache.loadManifest(entry);
    await cache.loadManifest(entry);

    expect(loadManifest).toHaveBeenCalledTimes(1);
  });

  it("calls loadCode again after the previous load rejected", async () => {
    const loadCode = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(CODE_MODULE);
    const cache = makePluginModuleCache();
    const entry = _makeEntry({ loadCode });

    await expect(cache.loadCode(entry)).rejects.toThrow("offline");
    await expect(cache.loadCode(entry)).resolves.toBe(CODE_MODULE);

    expect(loadCode).toHaveBeenCalledTimes(2);
  });
});
