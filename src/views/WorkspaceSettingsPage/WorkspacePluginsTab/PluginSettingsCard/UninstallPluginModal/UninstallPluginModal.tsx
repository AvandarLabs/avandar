import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { useState } from "react";
import { UninstallContentSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentSection";
import { UninstallModalFooter } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallModalFooter";
import { useRunUninstall } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useRunUninstall/useRunUninstall";
import { useUninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import { useKeepModalOpenWhile } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useKeepModalOpenWhile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/**
 * Why the modal is closing: the admin backed out, or the plugin was
 * uninstalled. The opener uses it to decide where focus goes next.
 */
export type UninstallModalCloseReason = "cancelled" | "uninstalled";

type Props = Readonly<{
  pluginName: string;
  pluginId: string;
  installationId: PluginInstallation.Id;

  /** The modal this is in, kept open while the uninstall runs. */
  modalId: string;
  onClose: (reason: UninstallModalCloseReason) => void;
}>;

/**
 * The confirm button's text: plain, naming how many datasets go too, or
 * saying every dataset is kept when the datasets could not be loaded.
 */
function _buildConfirmLabel(options: {
  checkedCount: number;
  hasFailed: boolean;
  uninstallLabel: string;
  keepAllLabel: string;
}): string {
  const { checkedCount, hasFailed, uninstallLabel, keepAllLabel } = options;
  if (hasFailed) {
    return keepAllLabel;
  }
  return checkedCount === 0
    ? uninstallLabel
    : plural(checkedCount, {
        one: "Uninstall and delete # dataset",
        other: "Uninstall and delete # datasets",
      });
}

/**
 * The ids in `checkedIds`, in the order the rows are listed. A row the admin
 * may no longer delete has no checkbox, so its id is left out even when it
 * was checked earlier.
 */
function _listCheckedIdsInRowOrder(
  rows: ReadonlyArray<{ datasetId: Dataset.Id; canDelete: boolean }>,
  checkedIds: ReadonlySet<Dataset.Id>,
): Dataset.Id[] {
  return rows
    .filter((row) => {
      return row.canDelete && checkedIds.has(row.datasetId);
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
 * When the datasets could not be loaded, it says so with a Retry and still
 * offers an uninstall that keeps every dataset.
 */
export function UninstallPluginModal(props: Props): JSX.Element {
  const { t } = useLingui();
  const content = useUninstallContentRows(props.pluginId);
  const { checkedIds, setIsChecked } = useCheckedDatasetIds();
  const uninstaller = useRunUninstall({
    pluginName: props.pluginName,
    installationId: props.installationId,
    rows: content.rows,
    onDone: () => {
      props.onClose("uninstalled");
    },
  });
  useKeepModalOpenWhile(uninstaller.isRunning, props.modalId);
  // Nothing loaded can be trusted after a failure, so nothing is deleted.
  const datasetIdsToDelete = content.hasFailed
    ? []
    : _listCheckedIdsInRowOrder(content.rows, checkedIds);
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
        confirmLabel={_buildConfirmLabel({
          checkedCount: datasetIdsToDelete.length,
          hasFailed: content.hasFailed,
          uninstallLabel: t`Uninstall`,
          keepAllLabel: t`Uninstall and keep all datasets`,
        })}
        isRunning={uninstaller.isRunning}
        isLoading={content.isLoading}
        onCancel={() => {
          props.onClose("cancelled");
        }}
        onConfirm={() => {
          void uninstaller.run(datasetIdsToDelete);
        }}
      />
    </Stack>
  );
}
