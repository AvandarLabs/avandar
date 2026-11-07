import { describe, expect, it } from "vitest";
import {
  getActivePluginsFromLoadablePlugins,
  getLoadablePluginsFromInstallations,
} from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

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

function _makeManifestModule(permissions: string[]): PluginManifestModule {
  return {
    manifest: { id: "avandar.epidemiology", permissions },
  } as unknown as PluginManifestModule;
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

describe("getActivePluginsFromLoadablePlugins", () => {
  const loadable = getLoadablePluginsFromInstallations({
    installations: [_makeInstallation({})],
    getEntry: _getEntry,
  });

  it("activates a plugin whose manifest permissions are all granted", () => {
    const manifestModule = _makeManifestModule(["data:context"]);

    const active = getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: [manifestModule],
    });

    expect(active).toEqual([{ ...loadable[0], manifestModule }]);
  });

  it("hides a plugin whose manifest asks for permissions not yet granted", () => {
    const active = getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: [_makeManifestModule(["data:context", "data:read"])],
    });

    expect(active).toEqual([]);
  });

  it("hides a plugin whose manifest module has not loaded", () => {
    const active = getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: [],
    });

    expect(active).toEqual([]);
  });
});
