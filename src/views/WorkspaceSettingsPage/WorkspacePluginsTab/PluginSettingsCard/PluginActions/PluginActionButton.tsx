import { useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { usePluginActionCopy } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/usePluginActionCopy";
import type { ConfirmedPluginActionKind } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginActions/PluginActions.types";
import type { PluginInstallationActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/usePluginInstallationActions/usePluginInstallationActions";
import type { ButtonProps } from "@mantine/core";

type Props = Readonly<{
  kind: ConfirmedPluginActionKind;
  pluginName: string;

  /** The id of the plugin's card heading, which describes this button. */
  headingId: string;
  isDisabled: boolean;

  /** Whether the plugin imported datasets into this workspace. */
  hasImportedDatasets: boolean;

  /** True until the card knows whether the plugin imported datasets. */
  isLoadingImportedDatasets: boolean;
  actions: PluginInstallationActions;
}>;

/** How each kind of action looks. Uninstall is the only destructive one. */
const STYLE_BY_KIND: Record<
  ConfirmedPluginActionKind,
  Pick<ButtonProps, "variant" | "color">
> = {
  review: {},
  enable: { variant: "outline" },
  disable: { variant: "outline", color: "neutral" },
  uninstall: { variant: "subtle", color: "danger" },
};

function _makeOnConfirmByKind(
  actions: PluginInstallationActions,
): Record<ConfirmedPluginActionKind, () => void> {
  return {
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
 * Uninstall of a plugin that imported datasets opens the uninstall modal
 * instead, which is its own confirmation.
 */
export function PluginActionButton({
  kind,
  pluginName,
  headingId,
  isDisabled,
  hasImportedDatasets,
  isLoadingImportedDatasets,
  actions,
}: Props): JSX.Element {
  const { t } = useLingui();
  const copy = usePluginActionCopy({ pluginName })[kind];
  const isUninstallWithDatasets = kind === "uninstall" && hasImportedDatasets;
  const style = STYLE_BY_KIND[kind];
  return (
    <Button
      size="compact-sm"
      {...style}
      aria-describedby={headingId}
      disabled={
        isDisabled || (kind === "uninstall" && isLoadingImportedDatasets)
      }
      onClick={() => {
        if (isUninstallWithDatasets) {
          actions.uninstallWithImportedDatasets();
          return;
        }
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
