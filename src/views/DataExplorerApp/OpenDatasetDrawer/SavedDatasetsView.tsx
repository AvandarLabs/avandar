import { useMutation } from "@hooks";
import {
  ActionIcon,
  Badge,
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
import { notifyError, notifySuccess } from "@ui";
import { where } from "@utils";
import { useState } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildSelectAllPreviewSQL } from "@/views/DataExplorerApp/OpenDatasetDrawer/datasetPreviewSQL";
import type { OpenDatasetInfo } from "@/views/DataExplorerApp/DataExplorerStateManager/dataExplorerAppState";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { VirtualDataset } from "$/models/datasets/VirtualDataset/VirtualDataset";

type Props = {
  onOpen: (info: OpenDatasetInfo, rawSQL: string) => void;
};

const SOURCE_TYPE_LABEL: Record<DatasetSource.SourceType, string> = {
  csv_file: "CSV",
  xlsx_file: "Excel",
  google_sheets: "Google Sheets",
  open_data: "Open data",
  virtual: "Derived",
};

/**
 * Lists every saved dataset in the workspace. Opening a derived (virtual)
 * dataset runs its stored SQL; opening any other dataset runs
 * `SELECT * FROM "<datasetId>" LIMIT 100` so the user lands on the dataset's
 * raw rows in the Data Explorer canvas.
 */
export function SavedDatasetsView({ onOpen }: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);

  const [datasets, isLoadingDatasets] = DatasetClient.useGetAll({
    ...where("workspace_id", "eq", workspace.id),
    useQueryOptions: { enabled: true },
  });

  const filtered = (datasets ?? []).filter((dataset) => {
    if (!debouncedSearch) {
      return true;
    }
    return dataset.name.toLowerCase().includes(debouncedSearch.toLowerCase());
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
    mutationFn: async (dataset: Dataset.T) => {
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
      dataset: Dataset.T;
      virtualDataset: VirtualDataset.T;
    }) => {
      onOpen(
        {
          datasetId: dataset.id,
          name: dataset.name,
          sourceType: "virtual",
          virtualDatasetId: virtualDataset.id,
        },
        virtualDataset.rawSQL,
      );
    },
    onError: (error: Error) => {
      notifyError(error.message);
    },
  });

  const openAsRawPreview = (dataset: Dataset.T) => {
    onOpen(
      {
        datasetId: dataset.id,
        name: dataset.name,
        sourceType: dataset.sourceType,
      },
      buildSelectAllPreviewSQL(dataset.id),
    );
  };

  const onOpenClick = (dataset: Dataset.T) => {
    match(dataset.sourceType)
      .with("virtual", () => {
        loadVirtualDataset(dataset);
      })
      .with("csv_file", "xlsx_file", "google_sheets", "open_data", () => {
        openAsRawPreview(dataset);
      })
      .exhaustive();
  };

  const onDeleteClick = (dataset: Dataset.T) => {
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
              <Table.Th w={120}>Type</Table.Th>
              <Table.Th w={140} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((dataset) => {
              return (
                <Table.Tr key={dataset.id}>
                  <Table.Td>{dataset.name}</Table.Td>
                  <Table.Td>
                    <Badge color="neutral" variant="light" size="sm">
                      {SOURCE_TYPE_LABEL[dataset.sourceType] ??
                        dataset.sourceType}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Button
                        size="compact-xs"
                        variant="light"
                        disabled={isBusy}
                        onClick={() => {
                          onOpenClick(dataset);
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
