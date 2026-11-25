import { describe, expect, it } from "vitest";
import { getInstallWizardStepsFromManifest } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/getInstallWizardStepsFromManifest/getInstallWizardStepsFromManifest";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

function _makeManifest(
  options: { hasDataSlots?: boolean; hasContent?: boolean } = {},
): PluginManifest {
  return {
    dataSlots: options.hasDataSlots
      ? { cases: { title: "%slot.cases.title%", attributes: {} } }
      : {},
    contributes: {
      content: options.hasContent ? [{ id: "provinces", kind: "dataset" }] : [],
    },
  } as unknown as PluginManifest;
}

describe("getInstallWizardStepsFromManifest", () => {
  it("skips Data slots and Content for a plugin that declares neither", () => {
    expect(getInstallWizardStepsFromManifest(_makeManifest())).toEqual([
      "review",
      "confirm",
    ]);
  });

  it("adds Data slots between Review and Confirm when the plugin declares data slots", () => {
    expect(
      getInstallWizardStepsFromManifest(_makeManifest({ hasDataSlots: true })),
    ).toEqual(["review", "dataSlots", "confirm"]);
  });

  it("adds Content between Review and Confirm when the plugin bundles content", () => {
    expect(
      getInstallWizardStepsFromManifest(_makeManifest({ hasContent: true })),
    ).toEqual(["review", "content", "confirm"]);
  });

  it("puts Data slots before Content when the plugin declares both", () => {
    expect(
      getInstallWizardStepsFromManifest(
        _makeManifest({ hasDataSlots: true, hasContent: true }),
      ),
    ).toEqual(["review", "dataSlots", "content", "confirm"]);
  });
});
