import {
  Box,
  Button,
  Container,
  FloatingIndicator,
  Group,
  Loader,
  MantineTheme,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "@tanstack/react-router";
import { EditableDisplayText } from "@ui/EditableDisplayText/EditableDisplayText";
import { notifyError, notifySuccess } from "@ui/notifications/notify";
import { where } from "@utils/filters/where/where";
import { prop } from "@utils/objects/hofs/prop/prop";
import { useEffect, useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { Paper } from "@/lib/ui/Paper/Paper";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { DatasetMetadataList } from "@/views/DataManagerApp/DatasetMetaView/DatasetMetadataList";
import { DataSummaryView } from "@/views/DataManagerApp/DatasetMetaView/DataSummaryView";
import { ToggleOfflineOnlyButton } from "@/views/DataManagerApp/DatasetMetaView/ToggleOfflineOnlyButton";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.types";

type Props = {
  dataset: Dataset;
};

type DatasetTabId = "dataset-metadata" | "dataset-summary";

/**
 * A view of the metadata for a dataset.
 */
export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
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

  const [currentTab, setCurrentTab] =
    useState<DatasetTabId>("dataset-metadata");

  // track the tab list refs so we can animate the tab indicator
  const [tabListRef, setTabListRef] = useState<HTMLDivElement | null>(null);
  const [tabItemRefs, setTabItemRefs] = useState<
    Record<DatasetTabId, HTMLButtonElement | null>
  >({
    "dataset-metadata": null,
    "dataset-summary": null,
  });
  const tabItemRefCallback = (tabItemId: DatasetTabId) => {
    return (node: HTMLButtonElement | null) => {
      tabItemRefs[tabItemId] = node; // intentional mutation
      setTabItemRefs(tabItemRefs);
    };
  };

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
                // this toggle is currently only supported for CSV datasets
                dataset.sourceType === "csv_file"
              ) ?
                <Box style={{ flexShrink: 0 }}>
                  <ToggleOfflineOnlyButton
                    isInCloudStorage={
                      datasetWithColumnsAndSource.source.isInCloudStorage
                    }
                    datasetId={dataset.id}
                    csvFileDatasetId={datasetWithColumnsAndSource.source.id}
                  />
                </Box>
              : null}
            </Group>
          </Group>
        </Group>

        <Paper>
          <Tabs
            variant="none"
            value={currentTab}
            onChange={(val) => {
              return setCurrentTab(val as DatasetTabId);
            }}
          >
            <Tabs.List
              mb="xs"
              ref={setTabListRef}
              pos="relative"
              style={styles.tabList}
            >
              <Tabs.Tab
                value="dataset-metadata"
                ref={tabItemRefCallback("dataset-metadata")}
              >
                <Text span>Metadata</Text>
              </Tabs.Tab>
              <Tabs.Tab
                value="dataset-summary"
                ref={tabItemRefCallback("dataset-summary")}
              >
                <Text span>Data Summary</Text>
              </Tabs.Tab>

              <FloatingIndicator
                target={tabItemRefs[currentTab]}
                parent={tabListRef}
                style={styles.tabIndicator}
              />
            </Tabs.List>

            <Tabs.Panel value="dataset-metadata">
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

                <DatasetMetadataList dataset={datasetWithColumnsAndSource} />
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
            </Tabs.Panel>

            <Tabs.Panel value="dataset-summary">
              {
                currentTab !== "dataset-summary" ?
                  null
                  // lazy load the data summary view because it has an expensive
                  // query
                : isLoadingFullDataset || !previewData || !datasetColumns ?
                  <Loader />
                : <DataSummaryView datasetId={dataset.id} />
              }
            </Tabs.Panel>

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
          </Tabs>
        </Paper>
      </Stack>
    </Container>
  );
}

const styles = {
  tabList: (theme: MantineTheme) => {
    return {
      borderBottom: `2px solid ${theme.colors.neutral[1]}`,
    };
  },
  tabIndicator: (theme: MantineTheme) => {
    return {
      position: "absolute",
      top: "2px",
      borderBottom: `2px solid ${theme.colors.primary[6]}`,
    };
  },
};
