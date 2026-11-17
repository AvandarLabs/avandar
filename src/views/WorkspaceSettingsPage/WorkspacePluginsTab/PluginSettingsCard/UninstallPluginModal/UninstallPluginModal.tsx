import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { UninstallContentList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentList";
import { UninstallModalFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallModalFooter";
import { useRunUninstall } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useRunUninstall";
import { useUninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import { useKeepModalOpenWhile } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

type Props = Readonly<{
  pluginName: string;
  pluginId: string;
  installationId: PluginInstallation.Id;

  /** The modal this is in, kept open while the uninstall runs. */
  modalId: string;
  onClose: () => void;
}>;

/** The confirm button's text: plain, or naming how many datasets go too. */
function _getConfirmLabel(
  checkedCount: number,
  uninstallLabel: string,
): string {
  return checkedCount === 0
    ? uninstallLabel
    : plural(checkedCount, {
        one: "Uninstall and delete # dataset",
        other: "Uninstall and delete # datasets",
      });
}

/** The ids in `checkedIds`, in the order the rows are listed. */
function _listCheckedIdsInRowOrder(
  rows: ReadonlyArray<{ datasetId: Dataset.Id }>,
  checkedIds: ReadonlySet<Dataset.Id>,
): Dataset.Id[] {
  return rows
    .filter((row) => {
      return checkedIds.has(row.datasetId);
    })
    .map((row) => {
      return row.datasetId;
    });
}

/** Checked dataset ids, with one id checked or unchecked. */
function _toggleCheckedId(
  checkedIds: ReadonlySet<Dataset.Id>,
  datasetId: Dataset.Id,
  isChecked: boolean,
): ReadonlySet<Dataset.Id> {
  const updatedIds = new Set(checkedIds);
  if (isChecked) {
    updatedIds.add(datasetId);
  } else {
    updatedIds.delete(datasetId);
  }
  return updatedIds;
}

/**
 * The body of the uninstall dialog of a plugin that imported datasets into
 * the workspace. It lists them, every one kept unless the admin checks it for
 * deletion, then uninstalls and deletes the checked ones. It keeps the modal
 * it is rendered in open while the uninstall runs, and closes it when done.
 */
export function UninstallPluginModal(props: Props): JSX.Element {
  const { t } = useLingui();
  const content = useUninstallContentRows(props.pluginId);
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<Dataset.Id>>(
    new Set(),
  );
  const uninstaller = useRunUninstall({
    pluginName: props.pluginName,
    installationId: props.installationId,
    rows: content.rows,
    onDone: props.onClose,
  });
  useKeepModalOpenWhile(uninstaller.isRunning, props.modalId);
  return (
    <Stack gap="md">
      <Text size="sm">{t`Its features are removed from this workspace.`}</Text>
      {/* Order 3 nests this under the modal's order 2 title. */}
      <Title order={3} size="h6">{t`Datasets it imported`}</Title>
      {content.isLoading ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : (
        <UninstallContentList
          rows={content.rows}
          hiddenCount={content.hiddenCount}
          installationId={props.installationId}
          checkedIds={checkedIds}
          isDisabled={uninstaller.isRunning}
          onIsCheckedChange={(datasetId, isChecked) => {
            setCheckedIds((previousIds) => {
              return _toggleCheckedId(previousIds, datasetId, isChecked);
            });
          }}
        />
      )}
      <Text size="sm" c="dimmed">{t`Unchecked datasets stay in Data Sources.`}</Text>
      <UninstallModalFooter
        confirmLabel={_getConfirmLabel(checkedIds.size, t`Uninstall`)}
        isRunning={uninstaller.isRunning}
        isLoading={content.isLoading}
        onCancel={props.onClose}
        onConfirm={() => {
          void uninstaller.run(
            _listCheckedIdsInRowOrder(content.rows, checkedIds),
          );
        }}
      />
    </Stack>
  );
}
