import { Group } from "@mantine/core";
import { PluginActionButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActionButton";
import { PluginInstallButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginInstallButton";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";

type Props = Readonly<{
  status: PluginInstallStatus;
  pluginName: string;

  /** The id of the plugin's card heading, which each action is described by. */
  headingId: string;
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
 * disabled, and so does everyone while a change is saving. Install opens the
 * install wizard; every other action asks the user to confirm first.
 */
export function PluginActions({
  status,
  pluginName,
  headingId,
  canManage,
  actions,
}: Props): JSX.Element {
  const isDisabled = !canManage || actions.isPending;
  return (
    <Group gap="xs" wrap="nowrap">
      {ACTION_KINDS_BY_STATUS[status].map((kind) => {
        return kind === "install" ? (
          <PluginInstallButton
            key={kind}
            headingId={headingId}
            isDisabled={isDisabled}
            onInstall={actions.install}
          />
        ) : (
          <PluginActionButton
            key={kind}
            kind={kind}
            pluginName={pluginName}
            headingId={headingId}
            isDisabled={isDisabled}
            actions={actions}
          />
        );
      })}
    </Group>
  );
}
