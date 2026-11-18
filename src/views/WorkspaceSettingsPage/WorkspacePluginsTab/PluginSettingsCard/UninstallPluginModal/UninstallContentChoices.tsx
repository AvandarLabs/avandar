import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { UninstallContentList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentList";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";

type Props = Readonly<{
  content: UninstallContentRows;
  installationId: PluginInstallation.Id;
  checkedIds: ReadonlySet<Dataset.Id>;
  isDisabled: boolean;
  onIsCheckedChange: (datasetId: Dataset.Id, isChecked: boolean) => void;

  /** The id of the heading that names the list. */
  labelId: string;
}>;

/**
 * The datasets an admin can keep or delete in the uninstall modal, once they
 * loaded: the list and the note that unchecked datasets stay. Each is left
 * out when there is nothing to choose.
 */
export function UninstallContentChoices({
  content,
  installationId,
  checkedIds,
  isDisabled,
  onIsCheckedChange,
  labelId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { rows, hiddenCount } = content;
  const canDeleteAny = rows.some((row) => {
    return row.canDelete;
  });
  return (
    <>
      {rows.length > 0 || hiddenCount > 0 ? (
        <UninstallContentList
          rows={rows}
          hiddenCount={hiddenCount}
          installationId={installationId}
          checkedIds={checkedIds}
          isDisabled={isDisabled}
          onIsCheckedChange={onIsCheckedChange}
          labelId={labelId}
        />
      ) : null}
      {canDeleteAny ? (
        <Text size="sm" c="dimmed">
          {t`Unchecked datasets stay in Data Sources.`}
        </Text>
      ) : null}
    </>
  );
}
