import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { modals } from "@mantine/modals";
import { DataSlotBindingAdminGate } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingAdminGate";
import { DataSlotBindingModalContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotBindingForm/DataSlotBindingModalContent";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * Opens a modal that rebinds one data slot of an installed plugin, titled
 * "Choose records for <slot title>", and resolves once it closes, saved or
 * not. Opened by Change on a plugin's card, and by a command's
 * `avandar.ui.openDataSlotBinding`, which anyone can run: a settings admin
 * gets the binding form, and anyone else is told to ask one. A slot the
 * manifest does not declare resolves at once without a modal.
 */
export function openDataSlotBindingModal(options: {
  pluginName: string;
  manifestModule: PluginManifestModule;
  installation: PluginInstallation.T;
  slotId: string;
}): Promise<void> {
  const { pluginName, manifestModule, installation, slotId } = options;
  const slot = getOwnValue(manifestModule.manifest.dataSlots, slotId);
  if (slot === undefined) {
    return Promise.resolve();
  }
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings: manifestModule.strings,
      locale: i18n.locale,
      value,
    });
  };
  const slotTitle = localize(slot.title);
  return new Promise((resolve) => {
    const closeModal = (): void => {
      modals.close(modalId);
    };
    const modalId = modals.open({
      title: t`Choose records for ${slotTitle}`,
      size: "xl",
      closeButtonProps: { "aria-label": t`Close` },
      onClose: resolve,
      children: (
        <DataSlotBindingAdminGate onClose={closeModal}>
          <DataSlotBindingModalContent
            {...{ pluginName, installation, slotId, slot, slotTitle, localize }}
            onClose={closeModal}
          />
        </DataSlotBindingAdminGate>
      ),
    });
  });
}
