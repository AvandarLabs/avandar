import {
  ActionIcon,
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
import { IconPencil, IconX } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { AppConfig } from "@/config/AppConfig";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { ChildRenderOptionsMap } from "@/lib/ui/ObjectDescriptionList/types";
import { Paper } from "@/lib/ui/Paper";
import { where } from "@/lib/utils/filters/filterBuilders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { Dataset, DatasetWithColumns } from "@/models/datasets/Dataset";
import { DataSummaryView } from "./DataSummaryView";
import { EditDatasetView } from "./EditDatasetView";

type Props = {
  dataset: Dataset;
};

const EXCLUDED_DATASET_METADATA_KEYS = [
  "id",
  "name",
  "description",
  "workspaceId",
  "ownerId",
  "ownerProfileId",
] satisfies ReadonlyArray<keyof DatasetWithColumns>;

const DATASET_METADATA_RENDER_OPTIONS = {
  columns: {
    renderAsTable: true,
    titleKey: "name",
    maxHeight: 400,
    itemRenderOptions: {
      excludeKeys: ["id", "datasetId", "workspaceId", "columnIdx"],
    },
  },
} satisfies ChildRenderOptionsMap<DatasetWithColumns>;

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

  const [previewData, isLoadingPreviewData] =
    DatasetRawDataClient.withLogger().useGetPreviewData({
      datasetId: dataset.id,
      numRows: AppConfig.dataManagerApp.maxPreviewRows,
    });
  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll(where("dataset_id", "eq", dataset.id));

  const datasetWithColumns = useMemo(() => {
    return { ...dataset, columns: datasetColumns };
  }, [dataset, datasetColumns]);

  const [isEditingDataset, setIsEditingDataset] = useState<boolean>(false);

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
  const datasetColumnNames = datasetColumns?.map(getProp("name")) ?? [];

  return (
    <Container pt="lg">
      <Stack>
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            {
              isEditingDataset ?
                <Group>
                  <EditDatasetView dataset={dataset} />
                  <ActionIcon
                    variant="subtle"
                    aria-label="Exit edit"
                    onClick={() => {
                      return setIsEditingDataset(false);
                    }}
                  >
                    <IconX size={20} />
                  </ActionIcon>
                </Group>
                // optional “exit edit” action
              : <Group>
                  <Title order={2}>{dataset.name}</Title>
                  <ActionIcon
                    variant="subtle"
                    aria-label="Edit dataset"
                    onClick={() => {
                      return setIsEditingDataset(true);
                    }}
                  >
                    <IconPencil size={20} />
                  </ActionIcon>
                </Group>

            }
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
                <Text>{dataset.description}</Text>

                <ObjectDescriptionList
                  data={datasetWithColumns}
                  excludeKeys={EXCLUDED_DATASET_METADATA_KEYS}
                  childRenderOptions={DATASET_METADATA_RENDER_OPTIONS}
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
            </Tabs.Panel>

            <Tabs.Panel value="dataset-summary">
              {isLoadingFullDataset || !previewData || !datasetColumns ?
                <Loader />
              : <DataSummaryView datasetId={dataset.id} />}
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
