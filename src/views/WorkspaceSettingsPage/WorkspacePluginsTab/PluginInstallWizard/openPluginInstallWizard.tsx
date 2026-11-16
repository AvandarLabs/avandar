import { t } from "@lingui/core/macro";
import { modals } from "@mantine/modals";
import { PluginInstallWizard } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/PluginInstallWizard";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

/**
 * Opens the install wizard for one plugin in a large modal titled
 * "Install <plugin name>". A plugin's settings card calls it from its Install
 * button. A click outside does not close it, so a half-made choice is not
 * lost; the close button and Escape still do.
 */
export function openPluginInstallWizard(options: {
  pluginName: string;
  manifestModule: PluginManifestModule;
}): void {
  const { pluginName, manifestModule } = options;
  const modalId = modals.open({
    title: t`Install ${pluginName}`,
    size: "xl",
    closeOnClickOutside: false,
    closeButtonProps: { "aria-label": t`Close` },
    children: (
      <PluginInstallWizard
        pluginName={pluginName}
        manifestModule={manifestModule}
        onClose={() => {
          modals.close(modalId);
        }}
      />
    ),
  });
}
