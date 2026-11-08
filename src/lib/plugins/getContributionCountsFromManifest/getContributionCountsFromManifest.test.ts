import { describe, expect, it } from "vitest";
import { getContributionCountsFromManifest } from "@/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

function _makeManifest(
  menus: PluginManifest["contributes"]["menus"],
): PluginManifest {
  return {
    contributes: { commands: [], menus, vizTypes: [] },
  } as unknown as PluginManifest;
}

describe("getContributionCountsFromManifest", () => {
  it("counts the Data Explorer toolbar items", () => {
    const manifest = _makeManifest({
      "dataExplorer.toolbar": [{ command: "a" }, { command: "b" }],
    });

    expect(getContributionCountsFromManifest(manifest)).toEqual({
      dataExplorerToolbarItems: 2,
    });
  });

  it("counts zero toolbar items when the manifest has no menus", () => {
    expect(getContributionCountsFromManifest(_makeManifest({}))).toEqual({
      dataExplorerToolbarItems: 0,
    });
  });
});
