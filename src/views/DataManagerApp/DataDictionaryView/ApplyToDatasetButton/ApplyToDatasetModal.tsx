import { Modal } from "@avandar/ui";
import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Select, Stack } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  isOpen: boolean;
  onClose: () => void;
};

/** Opens the apply flow for a dataset with only one dictionary in use. */
function useOpenApplyFlow(
  dictionaryId: DataDictionary.Id,
): (datasetId: Dataset.Id) => void {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  return (datasetId) => {
    const link = AppLinks.dataManagerApplyDictionaries({
      workspaceSlug: workspace.slug,
      datasetId,
    });
    navigate({
      to: link.to,
      params: link.params,
      search: { dictionaryId },
    });
  };
}

/** A searchable list of the workspace's datasets, read while `isOpen`. */
function DatasetSelect({
  isOpen,
  datasetId,
  onChange,
}: Readonly<{
  isOpen: boolean;
  datasetId: Dataset.Id | null;
  onChange: (datasetId: Dataset.Id | null) => void;
}>): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [datasets, isLoading] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: isOpen },
  });
  const options = (datasets ?? []).map((dataset) => {
    return { value: dataset.id, label: dataset.name };
  });
  return (
    <Select
      label={t`Dataset`}
      data={options}
      value={datasetId}
      onChange={(value) => {
        // The options' values are the datasets' ids.
        onChange(value as Dataset.Id | null);
      }}
      searchable
      disabled={isLoading}
      placeholder={isLoading ? t`Loading datasets…` : undefined}
      rightSection={isLoading ? <Loader size="xs" /> : undefined}
      nothingFoundMessage={isLoading ? undefined : t`No dataset has that name`}
    />
  );
}

/**
 * Picks the dataset to apply a dictionary to, then opens the apply flow for
 * it with only that dictionary in use.
 */
export function ApplyToDatasetModal({
  dictionary,
  isOpen,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const openApplyFlow = useOpenApplyFlow(dictionary.id);
  const [datasetId, setDatasetId] = useState<Dataset.Id | null>(null);
  const dictionaryName = dictionary.name;
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t`Apply ${dictionaryName} to a dataset`}
    >
      <Stack gap="md">
        <DatasetSelect
          isOpen={isOpen}
          datasetId={datasetId}
          onChange={setDatasetId}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!datasetId}
            onClick={() => {
              if (datasetId) {
                openApplyFlow(datasetId);
              }
            }}
          >
            <Trans>Continue</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
