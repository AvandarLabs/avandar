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
import type { UninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
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
function useConfirmLabel(options: {
  checkedCount: number;
  isKeepingAll: boolean;
}): string {
  const { checkedCount, isKeepingAll } = options;
  const { t } = useLingui();
  if (isKeepingAll) {
    return t`Uninstall and keep all datasets`;
  }
  return checkedCount === 0
    ? t`Uninstall`
    : plural(checkedCount, {
        one: "Uninstall and delete # dataset",
        other: "Uninstall and delete # datasets",
      });
}

/**
 * The ids in `checkedIds`, in the order the rows are listed. A row the admin
 * may no longer delete has no checkbox, so its id is left out even when it
 * was checked earlier. After a failed lookup nothing loaded can be trusted,
 * so no id is returned.
 */
function _listCheckedIdsInRowOrder(
  content: UninstallContentRows,
  checkedIds: ReadonlySet<Dataset.Id>,
): Dataset.Id[] {
  if (content.hasFailed || content.isRetrying) {
    return [];
  }
  return content.rows
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
  const datasetIdsToDelete = _listCheckedIdsInRowOrder(
    content,
    checkedIds,
  );
  const confirmLabel = useConfirmLabel({
    checkedCount: datasetIdsToDelete.length,
    isKeepingAll: content.hasFailed || content.isRetrying,
  });
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
        confirmLabel={confirmLabel}
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
