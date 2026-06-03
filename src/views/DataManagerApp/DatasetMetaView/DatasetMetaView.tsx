import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import {
  EditableDisplayText,
  notifyError,
  notifySuccess,
  Paper,
  Tabs,
} from "@ui";
import { prop, where } from "@utils";
import { useEffect, useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { DatasetMetadataList } from "@/views/DataManagerApp/DatasetMetaView/DatasetMetadataList";
import { DataSummaryView } from "@/views/DataManagerApp/DatasetMetaView/DataSummaryView";
import { ToggleOfflineOnlyButton } from "@/views/DataManagerApp/DatasetMetaView/ToggleOfflineOnlyButton";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  dataset: Dataset.T;
};

/**
 * A view of the metadata for a dataset.
 */
export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [appRoles] = useUserAppRoles();
  // True when the user has no data_sources app role; in that case the dataset
  // is visible only through a resource share. We surface this with a soft
  // informational banner; it never blocks rendering.
  const isShareOnlyAccess = !!appRoles && !appRoles.data_sources;
  const [deleteDataset, isDeletePending] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
  });
  const [sourceDataset, isLoadingSourceDataset] =
    DatasetClient.useGetSourceDataset({
      datasetId: dataset.id,
      sourceType: dataset.sourceType,
    });
  const [previewData, isLoadingPreviewData] =
    DatasetQueryClient.useGetPreviewData({
      datasetId: dataset.id,
      numRows: AppConfig.dataManagerApp.maxPreviewRows,
      workspaceId: workspace.id,
    });
  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll(where("dataset_id", "eq", dataset.id));
  const [updateDataset, isUpdatePending] = DatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess("Dataset updated successfully!");
    },
    onError: (err) => {
      notifyError(`There was an error on update: ${err.message}`);
    },
  });

  const datasetWithColumnsAndSource = useMemo(() => {
    return {
      ...dataset,
      source:
        !isLoadingSourceDataset && sourceDataset ? sourceDataset : undefined,
      columns: datasetColumns,
    };
  }, [dataset, datasetColumns, isLoadingSourceDataset, sourceDataset]);

  const isLoadingFullDataset = isLoadingPreviewData || isLoadingDatasetColumns;
  const datasetColumnNames = datasetColumns?.map(prop("name")) ?? [];
  const [datasetName, setDatasetName] = useState(dataset.name);
  const [datasetDescription, setDatasetDescription] = useState(
    dataset.description ?? "",
  );

  useEffect(() => {
    setDatasetName(dataset.name);
  }, [dataset.id, dataset.name]);

  useEffect(() => {
    setDatasetDescription(dataset.description ?? "");
  }, [dataset.description, dataset.id]);

  return (
    <Container py="md">
      <Stack>
        {isShareOnlyAccess ?
          <Alert color="blue" variant="light" title="Shared with you">
            <Text size="sm">
              You can view this dataset because it was shared with you.
            </Text>
          </Alert>
        : null}
        <Group justify="space-between" align="center" wrap="nowrap" w="100%">
          <Group
            gap="xs"
            align="center"
            wrap="nowrap"
            miw={0}
            style={{ flex: 1 }}
          >
            <Group
              gap="xxs"
              align="center"
              wrap="nowrap"
              miw={0}
              style={{ flex: 1 }}
            >
              <Box miw={0} style={{ flex: 1 }}>
                <EditableDisplayText
                  name="dataset name"
                  value={datasetName}
                  onChange={setDatasetName}
                  onSave={(newName) => {
                    updateDataset({
                      id: dataset.id,
                      data: {
                        name: newName.trim(),
                      },
                    });
                  }}
                  onCancel={() => {
                    setDatasetName(dataset.name);
                  }}
                  isSaving={isUpdatePending}
                  isSaveDisabled={datasetName.trim().length < 2}
                  minRows={1}
                  maxRows={2}
                  error={
                    (
                      datasetName.trim().length > 0 &&
                      datasetName.trim().length < 2
                    ) ?
                      "Dataset name must be at least 2 characters."
                    : undefined
                  }
                  emptyDisplayText="Untitled dataset"
                  displayTextProps={{
                    fw: "var(--mantine-h2-font-weight)",
                    fz: "var(--mantine-h2-font-size)",
                    lh: "var(--mantine-h2-line-height)",
                    m: 0,
                  }}
                  fw="var(--mantine-h2-font-weight)"
                  fz="var(--mantine-h2-font-size)"
                  lh="var(--mantine-h2-line-height)"
                />
              </Box>

              {(
                // only show the button if the source dataset has an
                // "isInCloudStorage" property
                datasetWithColumnsAndSource.source &&
                "isInCloudStorage" in datasetWithColumnsAndSource.source &&
                // this toggle is currently only supported for CSV and Excel
                // datasets
                (dataset.sourceType === "csv_file" ||
                  dataset.sourceType === "xlsx_file")
              ) ?
                <Box style={{ flexShrink: 0 }}>
                  <ToggleOfflineOnlyButton
                    isInCloudStorage={
                      datasetWithColumnsAndSource.source.isInCloudStorage
                    }
                    dataSource={datasetWithColumnsAndSource.source}
                  />
                </Box>
              : null}
            </Group>
          </Group>
          <ShareResourceButton
            resourceName={dataset.name}
            resourceType="dataset"
            resourceId={dataset.id}
          />
        </Group>

        <Paper>
          <Tabs
            tabIds={["dataset-metadata", "dataset-summary"] as const}
            renderTabHeader={{
              "dataset-metadata": "Metadata",
              "dataset-summary": "Data Summary",
            }}
            renderTabPanel={{
              "dataset-metadata": () => {
                return (
                  <Stack>
                    <EditableDisplayText
                      name="description"
                      value={datasetDescription}
                      textarea
                      onChange={setDatasetDescription}
                      isSaving={isUpdatePending}
                      emptyDisplayText="This dataset has no description."
                      onSave={(newDescription) => {
                        const descriptionToSave =
                          newDescription.trim().length === 0 ?
                            undefined
                          : newDescription;

                        updateDataset({
                          id: dataset.id,
                          data: {
                            description: descriptionToSave,
                          },
                        });
                      }}
                      onCancel={() => {
                        setDatasetDescription(dataset.description ?? "");
                      }}
                    />

                    <DatasetMetadataList
                      dataset={datasetWithColumnsAndSource}
                    />
                    <Title order={5}>Data preview</Title>
                    {isLoadingPreviewData ?
                      <Loader />
                    : previewData && previewData ?
                      <DataGrid
                        columnNames={datasetColumnNames}
                        data={previewData}
                      />
                    : null}
                  </Stack>
                );
              },
              "dataset-summary": () => {
                return isLoadingFullDataset || !previewData || !datasetColumns ?
                    <Loader />
                  : <DataSummaryView datasetId={dataset.id} />;
              },
            }}
          />

          <Button
            color="danger"
            mt="lg"
            onClick={() => {
              modals.openConfirmModal({
                title: "Delete dataset",
                children: (
                  <Text>Are you sure you want to delete {dataset.name}?</Text>
                ),
                labels: { confirm: "Delete", cancel: "Cancel" },
                confirmProps: {
                  color: "danger",
                  loading: isDeletePending,
                },
                onConfirm: () => {
                  deleteDataset(
                    { id: dataset.id },
                    {
                      onSuccess: () => {
                        navigate(AppLinks.dataManagerHome(workspace.slug));
                        notifications.show({
                          title: "Dataset deleted",
                          message: `${dataset.name} deleted successfully`,
                          color: "green",
                        });
                      },
                    },
                  );
                },
              });
            }}
          >
            Delete Dataset
          </Button>
        </Paper>
      </Stack>
    </Container>
  );
}
