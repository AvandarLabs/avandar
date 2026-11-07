import { Group } from "@mantine/core";
import { PluginActionButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActionButton";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";

type Props = Readonly<{
  status: PluginInstallStatus;
  pluginName: string;
  canManage: boolean;
  actions: PluginInstallationActions;
}>;

/** The actions a plugin offers at each install status, in button order. */
const ACTION_KINDS_BY_STATUS: Record<
  PluginInstallStatus,
  readonly PluginActionKind[]
> = {
  not_installed: ["install"],
  installed: ["disable", "uninstall"],
  disabled: ["enable", "uninstall"],
  needs_review: ["review", "disable", "uninstall"],
  unavailable: ["uninstall"],
};

/**
 * The buttons for one plugin's current status, such as Install for a plugin
 * the workspace does not have yet. Users who cannot manage plugins see them
 * disabled, and so does everyone while a change is saving.
 */
export function PluginActions({
  status,
  pluginName,
  canManage,
  actions,
}: Props): JSX.Element {
  return (
    <Group gap="xs" wrap="nowrap">
      {ACTION_KINDS_BY_STATUS[status].map((kind) => {
        return (
          <PluginActionButton
            key={kind}
            kind={kind}
            pluginName={pluginName}
            isDisabled={!canManage || actions.isPending}
            actions={actions}
          />
        );
      })}
    </Group>
  );
}
