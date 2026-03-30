import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconSearch, IconTrash } from "@tabler/icons-react";
import { where } from "@utils/filters/where/where";
import { notifyError, notifySuccess } from "@ui/index";
import { useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/VirtualDatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useMutation } from "@hooks/useMutation/useMutation";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.types";
import type { VirtualDatasetRead } from "$/models/datasets/VirtualDataset/VirtualDataset.types";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";

type Props = {
  onOpen: (info: OpenDatasetInfo, rawSQL: string) => void;
};

/**
 * Modal body for browsing and opening saved (virtual) datasets in the
 * Data Explorer. Only datasets created via AI query ("virtual" source type)
 * have a raw SQL query that can be loaded back into the explorer.
 */
export function OpenDatasetModal({ onOpen }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);

  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: true },
  });

  const virtualDatasets = (datasets ?? []).filter((d) => {
    return d.sourceType === "virtual";
  });

  const filtered = virtualDatasets.filter((d) => {
    if (!debouncedSearch) {
      return true;
    }
    return d.name.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess("Dataset deleted.");
    },
    onError: (error) => {
      notifyError(`Failed to delete dataset: ${error.message}`);
    },
  });

  const [loadVirtualDataset, isLoadingVirtualDataset] = useMutation({
    mutationFn: async (dataset: Dataset) => {
      const virtualDataset = await VirtualDatasetClient.getOne(
        where("dataset_id", "eq", dataset.id),
      );
      if (!virtualDataset) {
        throw new Error("Could not load the dataset's SQL query.");
      }
      return { dataset, virtualDataset };
    },
    onSuccess: ({
      dataset,
      virtualDataset,
    }: {
      dataset: Dataset;
      virtualDataset: VirtualDatasetRead;
    }) => {
      onOpen(
        {
          datasetId: dataset.id,
          name: dataset.name,
          virtualDatasetId: virtualDataset.id,
        },
        virtualDataset.rawSQL,
      );
      modals.closeAll();
    },
    onError: (error: Error) => {
      notifyError(error.message);
    },
  });

  const onDeleteClick = (dataset: Dataset) => {
    modals.openConfirmModal({
      title: "Delete dataset",
      children: (
        <Text size="sm">
          Are you sure you want to permanently delete{" "}
          <strong>{dataset.name}</strong>? This cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deleteDataset({ id: dataset.id });
      },
    });
  };

  const isBusy = isLoadingVirtualDataset || isDeletingDataset;

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Search datasets..."
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(e) => {
          setSearch(e.currentTarget.value);
        }}
      />

      {isLoadingDatasets ?
        <Text c="dimmed" size="sm">
          Loading datasets…
        </Text>
      : filtered.length === 0 ?
        <Text c="dimmed" size="sm">
          No saved datasets found.
        </Text>
      : <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th w={100} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((dataset) => {
              return (
                <Table.Tr key={dataset.id}>
                  <Table.Td>{dataset.name}</Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        size="compact-xs"
                        variant="light"
                        disabled={isBusy}
                        onClick={() => {
                          loadVirtualDataset(dataset);
                        }}
                      >
                        Open
                      </Button>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        disabled={isBusy}
                        aria-label={`Delete ${dataset.name}`}
                        onClick={() => {
                          onDeleteClick(dataset);
                        }}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      }
    </Stack>
  );
}
