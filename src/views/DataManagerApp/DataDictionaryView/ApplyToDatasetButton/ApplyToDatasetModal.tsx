import { Modal } from "@avandar/ui";
import { where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group, Select, Stack } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { ReactNode } from "react";

type Props = {
  dictionary: DataDictionary.T;
  isOpen: boolean;
  onClose: () => void;
};

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
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [datasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: isOpen },
  });
  const options = (datasets ?? []).map((dataset) => {
    return { value: dataset.id, label: dataset.name };
  });
  const dictionaryName = dictionary.name;
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={t`Apply ${dictionaryName} to a dataset`}
    >
      <Stack gap="md">
        <Select
          label={t`Dataset`}
          data={options}
          value={datasetId}
          onChange={setDatasetId}
          searchable
          nothingFoundMessage={t`No dataset has that name`}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            disabled={!datasetId}
            onClick={() => {
              if (datasetId) {
                navigate({
                  ...AppLinks.dataManagerApplyDictionaries({
                    workspaceSlug: workspace.slug,
                    datasetId,
                  }),
                  search: { dictionaryId: dictionary.id },
                });
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
