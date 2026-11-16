import { useLingui } from "@lingui/react/macro";
import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";

/** The translated words of one action: its button and its confirmation. */
export type PluginActionCopy = Readonly<{
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;
}>;

/**
 * The translated button label and confirmation text of every plugin action,
 * naming the plugin the action applies to. A plugin action button reads its
 * own entry before it asks the user to confirm.
 */
export function usePluginActionCopy(
  pluginName: string,
): Record<PluginActionKind, PluginActionCopy> {
  const { t } = useLingui();
  return {
    install: {
      label: t`Install`,
      confirmTitle: t`Install ${pluginName}?`,
      confirmBody: t`${pluginName} will be available to every member of this workspace.`,
      confirmLabel: t`Install`,
    },
    review: {
      label: t`Review new permissions`,
      confirmTitle: t`Approve new permissions for ${pluginName}?`,
      confirmBody: t`This version asks for permissions listed on its card. It stays hidden until you approve them.`,
      confirmLabel: t`Approve`,
    },
    enable: {
      label: t`Enable`,
      confirmTitle: t`Enable ${pluginName}?`,
      confirmBody: t`Its features come back for every member.`,
      confirmLabel: t`Enable`,
    },
    disable: {
      label: t`Disable`,
      confirmTitle: t`Disable ${pluginName}?`,
      confirmBody: t`Its features disappear for every member until you enable it again.`,
      confirmLabel: t`Disable`,
    },
    uninstall: {
      label: t`Uninstall`,
      confirmTitle: t`Uninstall ${pluginName}?`,
      confirmBody: t`Its features are removed from this workspace.`,
      confirmLabel: t`Uninstall`,
    },
  };
}
