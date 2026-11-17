import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useState } from "react";
import { UninstallContentSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentSection";
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
function _buildConfirmLabel(
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

/**
 * The ids of the datasets checked for deletion, none at first, and a setter
 * that checks or unchecks one.
 */
function useCheckedDatasetIds(): {
  checkedIds: ReadonlySet<Dataset.Id>;
  setIsChecked: (datasetId: Dataset.Id, isChecked: boolean) => void;
} {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<Dataset.Id>>(
    new Set(),
  );
  const setIsChecked = (datasetId: Dataset.Id, isChecked: boolean): void => {
    setCheckedIds((previousIds) => {
      const updatedIds = new Set(previousIds);
      if (isChecked) {
        updatedIds.add(datasetId);
      } else {
        updatedIds.delete(datasetId);
      }
      return updatedIds;
    });
  };
  return { checkedIds, setIsChecked };
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
  const { checkedIds, setIsChecked } = useCheckedDatasetIds();
  const uninstaller = useRunUninstall({
    pluginName: props.pluginName,
    installationId: props.installationId,
    rows: content.rows,
    onDone: props.onClose,
  });
  useKeepModalOpenWhile(uninstaller.isRunning, props.modalId);
  const datasetIdsToDelete = _listCheckedIdsInRowOrder(
    content.rows,
    checkedIds,
  );
  return (
    <Stack gap="md">
      <Text size="sm">{t`Its features are removed from this workspace.`}</Text>
      <UninstallContentSection
        content={content}
        installationId={props.installationId}
        checkedIds={checkedIds}
        isDisabled={uninstaller.isRunning}
        onIsCheckedChange={setIsChecked}
      />
      <UninstallModalFooter
        confirmLabel={_buildConfirmLabel(
          datasetIdsToDelete.length,
          t`Uninstall`,
        )}
        isRunning={uninstaller.isRunning}
        isLoading={content.isLoading}
        onCancel={props.onClose}
        onConfirm={() => {
          void uninstaller.run(datasetIdsToDelete);
        }}
      />
    </Stack>
  );
}
