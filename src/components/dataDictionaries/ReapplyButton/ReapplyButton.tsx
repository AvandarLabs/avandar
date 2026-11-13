import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
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
 * Whether re-applying changes the dataset for the whole workspace: true
 * for an upload synced to the cloud, and while its source is still being
 * read, so the question is asked rather than skipped.
 */
function useChangesWorkspace(dataset: Props["dataset"]): boolean {
  const [source] = DatasetClient.useGetSourceDataset({
    datasetId: dataset.id,
    sourceType: dataset.sourceType,
  });
  return !source || !("isInCloudStorage" in source) || source.isInCloudStorage;
}

/**
 * Re-applies a dictionary to a dataset converted in place, so its pinned
 * columns take the dictionary's current version. Asks first when the
 * dataset is synced to the workspace. Shown wherever a dataset is behind
 * its dictionary, for someone who can edit the dataset: the Used by tab
 * and the dataset rail.
 */
export function ReapplyButton({
  dataset,
  dictionaryId,
  dictionaryName,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const datasetName = dataset.name;
  const changesWorkspace = useChangesWorkspace(dataset);
  const [reapply, isReapplying] = useReapplyDictionary({
    datasetId: dataset.id,
    datasetName,
    dictionaryId,
    dictionaryName,
  });
  const onClick = (): void => {
    if (!changesWorkspace) {
      reapply();
      return;
    }
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
      onConfirm: reapply,
    });
  };
  return (
    <Button
      size="compact-xs"
      variant="light"
      loading={isReapplying}
      onClick={onClick}
      aria-label={t`Re-apply ${dictionaryName} to ${datasetName}`}
    >
      <Trans>Re-apply</Trans>
    </Button>
  );
}
