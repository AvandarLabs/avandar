import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

/**
 * One step of the plugin install wizard, in the order the wizard shows them.
 *
 * - `review`: what the plugin adds and which data it can read.
 * - `dataSlots`: choose the records each data slot reads.
 * - `content`: choose which bundled datasets to import.
 * - `confirm`: a summary, the Install button, and import progress.
 */
export type InstallWizardStep = "review" | "dataSlots" | "content" | "confirm";

/**
 * Gets the install wizard steps a manifest needs, leaving out the steps it
 * has nothing for: Data slots without data slots, and Content without
 * bundled content. The wizard reads it to build its stepper.
 */
export function getInstallWizardStepsFromManifest(
  manifest: PluginManifest,
): readonly InstallWizardStep[] {
  const hasDataSlots = Object.keys(manifest.dataSlots).length > 0;
  const hasContent = manifest.contributes.content.length > 0;
  return [
    "review",
    ...(hasDataSlots ? (["dataSlots"] as const) : []),
    ...(hasContent ? (["content"] as const) : []),
    "confirm",
  ];
}
