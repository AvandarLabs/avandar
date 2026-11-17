import { useLingui } from "@lingui/react/macro";
import { Checkbox, Stack, Text } from "@mantine/core";
import { UninstallDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents/UninstallDatasetDependents";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRow as Row } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";

type Props = Readonly<{
  row: Row;
  installationId: PluginInstallation.Id;
  isChecked: boolean;
  isDisabled: boolean;
  onIsCheckedChange: (isChecked: boolean) => void;
}>;

/**
 * One dataset a plugin imported, in the uninstall modal: a "Delete <name>"
 * checkbox and, while it is checked, what reads the dataset. A dataset the
 * user may not delete shows its name and why it is kept instead.
 */
export function UninstallContentRow({
  row,
  installationId,
  isChecked,
  isDisabled,
  onIsCheckedChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { name } = row;
  if (!row.canDelete) {
    return (
      <Stack gap={0}>
        <Text size="sm">{name}</Text>
        <Text size="xs" c="dimmed">
          {t`Kept. Only a dataset admin can delete it.`}
        </Text>
      </Stack>
    );
  }
  return (
    <Stack gap="xxs">
      <Checkbox
        label={t`Delete ${name}`}
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => {
          onIsCheckedChange(event.currentTarget.checked);
        }}
      />
      {isChecked ? (
        <UninstallDatasetDependents
          datasetId={row.datasetId}
          installationId={installationId}
        />
      ) : null}
    </Stack>
  );
}
