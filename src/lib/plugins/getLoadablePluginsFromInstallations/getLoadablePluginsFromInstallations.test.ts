import { describe, expect, it } from "vitest";
import { getLoadablePluginsFromInstallations } from "@/lib/plugins/getLoadablePluginsFromInstallations/getLoadablePluginsFromInstallations";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginIndexEntry } from "@/lib/plugins/PluginIndex.types";

const ENTRY = { id: "avandar.epidemiology" } as PluginIndexEntry;

function _makeInstallation(
  overrides: Partial<PluginInstallation.T>,
): PluginInstallation.T {
  return {
    pluginId: "avandar.epidemiology",
    isEnabled: true,
    grantedPermissions: ["data:context"],
    ...overrides,
  } as PluginInstallation.T;
}

function _getEntry(pluginId: string): PluginIndexEntry | undefined {
  return pluginId === ENTRY.id ? ENTRY : undefined;
}

describe("getLoadablePluginsFromInstallations", () => {
  it("keeps an enabled install of a bundled plugin with its index entry", () => {
    const installation = _makeInstallation({});

    const loadable = getLoadablePluginsFromInstallations({
      installations: [installation],
      getEntry: _getEntry,
    });

    expect(loadable).toEqual([{ installation, entry: ENTRY }]);
  });

  it("drops a disabled install", () => {
    const loadable = getLoadablePluginsFromInstallations({
      installations: [_makeInstallation({ isEnabled: false })],
      getEntry: _getEntry,
    });

    expect(loadable).toEqual([]);
  });

  it("drops an install of a plugin the deployment no longer bundles", () => {
    const loadable = getLoadablePluginsFromInstallations({
      installations: [_makeInstallation({ pluginId: "avandar.removed" })],
      getEntry: _getEntry,
    });

    expect(loadable).toEqual([]);
  });
});
