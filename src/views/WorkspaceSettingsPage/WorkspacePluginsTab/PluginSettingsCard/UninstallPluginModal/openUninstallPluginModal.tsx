import { t } from "@lingui/core/macro";
import { randomId } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { UninstallPluginModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallPluginModal";
import { returnFocusFromOpener } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/returnFocusFromOpener";
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
  }>,
): void {
  const { pluginName } = options;
  const opener = document.activeElement;
  const headingId = opener?.getAttribute("aria-describedby") ?? null;
  const modalId = randomId();
  modals.open({
    modalId,
    title: t`Uninstall ${pluginName}?`,
    closeOnClickOutside: false,
    closeButtonProps: { "aria-label": t`Close` },
    // A finished uninstall removes the Uninstall button, so focus goes to the
    // card heading then. `onClose` runs for Cancel, Escape, the close button,
    // and a finished uninstall alike.
    returnFocus: false,
    onClose: () => {
      window.setTimeout(() => {
        returnFocusFromOpener(opener, headingId);
      }, 0);
    },
    children: (
      <UninstallPluginModal
        {...options}
        modalId={modalId}
        onClose={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}
