import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/**
 * Why an uninstall did not take effect.
 * - `still_installed`: the delete ran but the install is still there, as
 *   happens when row level security refuses a delete without raising an error.
 * - `not_confirmed`: the delete ran but reading the install back failed, so it
 *   is unknown whether the plugin is still installed.
 */
export type UninstallPluginErrorReason = "still_installed" | "not_confirmed";

/**
 * Thrown by `uninstallPluginAndDeleteDatasets` when it cannot show that the
 * plugin was uninstalled, before it deletes any dataset. A caller that shows
 * the failure checks `instanceof` and translates `reason` into copy. The
 * message is for logs only.
 */
export class UninstallPluginError extends Error {
  readonly reason: UninstallPluginErrorReason;
  readonly installationId: PluginInstallation.Id;

  /** Creates an error naming the install and why it was not uninstalled. */
  constructor(
    options: Readonly<{
      installationId: PluginInstallation.Id;
      reason: UninstallPluginErrorReason;
      cause?: unknown;
    }>,
  ) {
    super(
      options.reason === "still_installed"
        ? `Plugin install '${options.installationId}' is still present after its delete.`
        : `Could not confirm that plugin install '${options.installationId}' was deleted.`,
      { cause: options.cause },
    );
    this.name = "UninstallPluginError";
    this.reason = options.reason;
    this.installationId = options.installationId;
  }
}
