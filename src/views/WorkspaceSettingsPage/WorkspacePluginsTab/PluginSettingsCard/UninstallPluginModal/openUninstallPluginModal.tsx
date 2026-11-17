import { t } from "@lingui/core/macro";
import { randomId } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
import {
  returnFocusFromOpener,
  returnFocusToCardHeading,
} from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/returnFocusFromOpener";
import type { UninstallModalCloseReason } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/**
 * Opens the uninstall dialog of a plugin that imported datasets, titled
 * "Uninstall <plugin name>?". The `usePluginInstallationActions` hook calls
 * it for a settings card's Uninstall button. A click outside never closes
 * it, and while the uninstall runs neither do Escape and the close button.
 */
export function openUninstallPluginModal(
  options: Readonly<{
    pluginName: string;
    pluginId: string;
    installationId: PluginInstallation.Id;

    /** The button that opened the dialog, where focus returns on Cancel. */
    opener: HTMLElement;

    /** The id of the card's heading, where focus goes once uninstalled. */
    headingId: string;
  }>,
): void {
  const { pluginName, opener, headingId } = options;
  const modalId = randomId();
  let closeReason: UninstallModalCloseReason = "cancelled";
  modals.open({
    modalId,
    title: t`Uninstall ${pluginName}?`,
    closeOnClickOutside: false,
    closeButtonProps: { "aria-label": t`Close` },
    // A finished uninstall removes the Uninstall button, so focus goes to the
    // card heading then, and back to the opener otherwise. `onClose` runs for
    // Cancel, Escape, the close button, and a finished uninstall alike.
    returnFocus: false,
    onClose: () => {
      window.setTimeout(() => {
        if (closeReason === "uninstalled") {
          returnFocusToCardHeading(opener, headingId);
        } else {
          returnFocusFromOpener(opener, headingId);
        }
      }, 0);
    },
    children: (
      <UninstallPluginModal
        pluginName={pluginName}
        pluginId={options.pluginId}
        installationId={options.installationId}
        modalId={modalId}
        onClose={(reason) => {
          closeReason = reason;
          modals.close(modalId);
        }}
      />
    ),
  });
}
