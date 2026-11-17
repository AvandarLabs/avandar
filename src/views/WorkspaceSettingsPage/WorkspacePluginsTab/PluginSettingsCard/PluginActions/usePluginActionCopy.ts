import { useLingui } from "@lingui/react/macro";
import type { ConfirmedPluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";

/** The translated words of one action: its button and its confirmation. */
export type PluginActionCopy = Readonly<{
  label: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;

  /**
   * A second paragraph for the confirmation, for an uninstall that cannot
   * tell whether the plugin imported datasets. Only Uninstall has one.
   */
  datasetLookupFailedNote?: string;
}>;

/**
 * The translated button label and confirmation text of every plugin action
 * that asks before it runs, naming the plugin the action applies to. A
 * plugin action button reads its own entry before it asks the user to
 * confirm. A plugin that imported datasets gets the uninstall modal instead
 * of this confirmation.
 */
export function usePluginActionCopy(options: {
  pluginName: string;
}): Record<ConfirmedPluginActionKind, PluginActionCopy> {
  const { pluginName } = options;
  const { t } = useLingui();
  return {
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
      datasetLookupFailedNote: t`We could not check for datasets this plugin imported. If you uninstall it now, every dataset it imported is kept.`,
    },
  };
}
