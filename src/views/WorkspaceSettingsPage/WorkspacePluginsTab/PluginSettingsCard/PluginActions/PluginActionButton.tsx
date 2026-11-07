import { useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { usePluginActionCopy } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/usePluginActionCopy";
import type { PluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import type { ButtonProps } from "@mantine/core";

type Props = Readonly<{
  kind: PluginActionKind;
  pluginName: string;
  isDisabled: boolean;
  actions: PluginInstallationActions;
}>;

/** How each kind of action looks. Uninstall is the only destructive one. */
const STYLE_BY_KIND: Record<
  PluginActionKind,
  Pick<ButtonProps, "variant" | "color">
> = {
  install: {},
  review: {},
  enable: { variant: "outline" },
  disable: { variant: "outline", color: "neutral" },
  uninstall: { variant: "subtle", color: "danger" },
};

function _makeOnConfirmByKind(
  actions: PluginInstallationActions,
): Record<PluginActionKind, () => void> {
  return {
    install: actions.install,
    review: actions.approvePermissions,
    enable: () => {
      actions.setIsEnabled(true);
    },
    disable: () => {
      actions.setIsEnabled(false);
    },
    uninstall: actions.uninstall,
  };
}

/**
 * One action button on a plugin's settings card. Clicking it opens a
 * confirmation, and the action runs only once the user confirms, because
 * every action changes the plugin for every member of the workspace.
 */
export function PluginActionButton({
  kind,
  pluginName,
  isDisabled,
  actions,
}: Props): JSX.Element {
  const { t } = useLingui();
  const copy = usePluginActionCopy(pluginName)[kind];
  const style = STYLE_BY_KIND[kind];
  return (
    <Button
      size="compact-sm"
      {...style}
      disabled={isDisabled}
      onClick={() => {
        modals.openConfirmModal({
          title: copy.confirmTitle,
          children: <Text size="sm">{copy.confirmBody}</Text>,
          labels: { confirm: copy.confirmLabel, cancel: t`Cancel` },
          confirmProps: { color: style.color },
          onConfirm: _makeOnConfirmByKind(actions)[kind],
        });
      }}
    >
      {copy.label}
    </Button>
  );
}
