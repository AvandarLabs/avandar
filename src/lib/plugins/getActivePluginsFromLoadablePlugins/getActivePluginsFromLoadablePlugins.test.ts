import { describe, expect, it } from "vitest";
import { getActivePluginsFromLoadablePlugins } from "@/lib/plugins/getActivePluginsFromLoadablePlugins/getActivePluginsFromLoadablePlugins";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { LoadablePluginInstallation } from "@/lib/plugins/getLoadablePluginsFromInstallations/getLoadablePluginsFromInstallations";
import type {
  PluginIndexEntry,
  PluginManifestModule,
} from "@/lib/plugins/PluginIndex.types";

const EPIDEMIOLOGY_ID = "avandar.epidemiology";
const ALPHA_ID = "avandar.alpha";
const BETA_ID = "avandar.beta";

function _makeLoadablePlugin(pluginId: string): LoadablePluginInstallation {
  return {
    installation: {
      pluginId,
      isEnabled: true,
      grantedPermissions: ["data:context"],
    } as PluginInstallation.T,
    entry: { id: pluginId } as PluginIndexEntry,
  };
}

function _makeManifestModule(options: {
  id: string;
  permissions: string[];
}): PluginManifestModule {
  return {
    manifest: { id: options.id, permissions: options.permissions },
  } as unknown as PluginManifestModule;
}

describe("getActivePluginsFromLoadablePlugins", () => {
  const loadable = [_makeLoadablePlugin(EPIDEMIOLOGY_ID)];

  it("activates a plugin whose manifest permissions are all granted", () => {
    const manifestModule = _makeManifestModule({
      id: EPIDEMIOLOGY_ID,
      permissions: ["data:context"],
    });

    const active = getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: [manifestModule],
    });

    expect(active).toEqual([{ ...loadable[0], manifestModule }]);
  });

  it("hides a plugin whose manifest asks for permissions not yet granted", () => {
    const active = getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: [
        _makeManifestModule({
          id: EPIDEMIOLOGY_ID,
          permissions: ["data:context", "data:read"],
        }),
      ],
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

  it("pairs each loadable plugin with the manifest of its own id when manifests arrive in reverse order", () => {
    const alpha = _makeLoadablePlugin(ALPHA_ID);
    const beta = _makeLoadablePlugin(BETA_ID);
    const alphaManifest = _makeManifestModule({
      id: ALPHA_ID,
      permissions: ["data:context"],
    });
    const betaManifest = _makeManifestModule({
      id: BETA_ID,
      permissions: ["data:context"],
    });

    const active = getActivePluginsFromLoadablePlugins({
      loadable: [alpha, beta],
      manifestModules: [betaManifest, alphaManifest],
    });

    expect(active).toEqual([
      { ...alpha, manifestModule: alphaManifest },
      { ...beta, manifestModule: betaManifest },
    ]);
  });

  it("leaves a plugin inactive when the only manifest module has an unrelated id", () => {
    const active = getActivePluginsFromLoadablePlugins({
      loadable,
      manifestModules: [
        _makeManifestModule({
          id: "avandar.unrelated",
          permissions: ["data:context"],
        }),
      ],
    });

    expect(active).toEqual([]);
  });
});
