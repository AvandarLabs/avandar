import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { useReapplyDictionary } from "@/hooks/dataDictionaries/useReapplyDictionary/useReapplyDictionary";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dataset: Pick<Dataset.T, "id" | "name" | "sourceType">;
  dictionaryId: DataDictionary.Id;
  dictionaryName: string;
};

/**
 * Reads, when called, whether re-applying changes the dataset for the
 * whole workspace: true for an upload synced to the cloud, and when its
 * source cannot be read, so the question is asked rather than skipped.
 * The read happens on click, not on render, so a long Used by table does
 * not read every row's source.
 */
function useReadChangesWorkspace(
  dataset: Props["dataset"],
): () => Promise<boolean> {
  const queryClient = useQueryClient();
  return async () => {
    const params = { datasetId: dataset.id, sourceType: dataset.sourceType };
    try {
      const source = await queryClient.fetchQuery({
        queryKey: DatasetClient.QueryKeys.getSourceDataset(params),
        queryFn: () => {
          return DatasetClient.getSourceDataset(params);
        },
      });
      return (
        !source || !("isInCloudStorage" in source) || source.isInCloudStorage
      );
    } catch {
      return true;
    }
  };
}

/** Opens the dialog that asks before re-applying to a synced dataset. */
function useOpenReapplyConfirm(
  options: Readonly<{
    datasetName: string;
    dictionaryName: string;
    onConfirm: () => void;
  }>,
): () => void {
  const { t } = useLingui();
  const { datasetName, dictionaryName, onConfirm } = options;
  return () => {
    modals.openConfirmModal({
      title: t`Re-apply ${dictionaryName}?`,
      children: (
        <Text size="sm">
          <Trans>
            This changes {datasetName} for everyone in the workspace who uses
            it.
          </Trans>
        </Text>
      ),
      labels: { confirm: t`Re-apply`, cancel: t`Cancel` },
      onConfirm,
    });
  };
}

/**
 * Re-applies a dictionary to a dataset converted in place, so its pinned
 * columns take the dictionary's current version. Asks first when the
 * dataset is synced to the workspace, which it reads on click. Shown
 * wherever a dataset is behind its dictionary, for someone who can edit
 * the dataset: the Used by tab and the dataset rail.
 */
export function ReapplyButton({
  dataset,
  dictionaryId,
  dictionaryName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const datasetName = dataset.name;
  const readChangesWorkspace = useReadChangesWorkspace(dataset);
  const [isChecking, setIsChecking] = useState(false);
  const [reapply, isReapplying] = useReapplyDictionary({
    datasetId: dataset.id,
    datasetName,
    dictionaryId,
    dictionaryName,
  });
  const openConfirm = useOpenReapplyConfirm({
    datasetName,
    dictionaryName,
    onConfirm: reapply,
  });
  const onClick = async (): Promise<void> => {
    if (isChecking) {
      return;
    }
    setIsChecking(true);
    const changesWorkspace = await readChangesWorkspace();
    setIsChecking(false);
    if (changesWorkspace) {
      openConfirm();
      return;
    }
    reapply();
  };
  return (
    <Button
      size="compact-xs"
      variant="light"
      loading={isChecking || isReapplying}
      onClick={onClick}
      aria-label={t`Re-apply ${dictionaryName} to ${datasetName}`}
    >
      <Trans>Re-apply</Trans>
    </Button>
  );
}
