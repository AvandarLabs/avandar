import {
  Button,
  Container,
  FloatingIndicator,
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
import { useMemo, useState } from "react";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataGrid } from "@/lib/ui/data-viz/DataGrid";
import { ObjectDescriptionList } from "@/lib/ui/ObjectDescriptionList";
import { ChildRenderOptionsMap } from "@/lib/ui/ObjectDescriptionList/types";
import { Paper } from "@/lib/ui/Paper";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { type LocalDataset } from "@/models/LocalDataset/types";
import { DataSummaryView } from "./DataSummaryView";
import { EditDatasetView } from "./EditDatasetView";

type Props = {
  dataset: LocalDataset;
};

const EXCLUDED_DATASET_METADATA_KEYS = [
  "id",
  "name",
  "datasetType",
  "data",
  "description",
  "workspaceId",
] as const;

const DATASET_METADATA_RENDER_OPTIONS: ChildRenderOptionsMap<LocalDataset> = {
  fields: {
    renderAsTable: true,
    titleKey: "name",
    maxHeight: 400,
    itemRenderOptions: {
      excludeKeys: ["id"],
    },
  },
};

type DatasetTabId = "dataset-metadata" | "dataset-summary" | "dataset-edit";

/**
 * A view of the metadata for a dataset.
 *
 * TODO(jpsyx): We should show only a preview (first 100 rows) of the data.
 * Currently, we are still showing all data, which isn't great.
 */
export function DatasetMetaView({ dataset }: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [deleteLocalDataset, isDeletePending] = LocalDatasetClient.useDelete({
    queryToInvalidate: LocalDatasetClient.QueryKeys.getAll(),
  });
  const [parsedDataset, isLoadingParsedDataset] =
    LocalDatasetClient.useGetParsedLocalDataset({
      id: dataset.id,
    });

  // TODO(jpsyx): eventually the dataset should be streamed, rather than
  // storing it all in memory. Right now this doesnt save any memory if we
  // load it all and then just take a slice.
  const previewData = useMemo(() => {
    return (parsedDataset?.data ?? []).slice(0, 200);
  }, [parsedDataset]);

  const datasetColumnNames = useMemo(() => {
    return parsedDataset?.fields.map(getProp("name")) ?? [];
  }, [parsedDataset]);

  const [currentTab, setCurrentTab] =
    useState<DatasetTabId>("dataset-metadata");

  // track the tab list refs so we can animate the tab indicator
  const [tabListRef, setTabListRef] = useState<HTMLDivElement | null>(null);
  const [tabItemRefs, setTabItemRefs] = useState<
    Record<DatasetTabId, HTMLButtonElement | null>
  >({
    "dataset-metadata": null,
    "dataset-summary": null,
    "dataset-edit": null,
  });
  const tabItemRefCallback = (tabItemId: DatasetTabId) => {
    return (node: HTMLButtonElement | null) => {
      tabItemRefs[tabItemId] = node; // intentional mutation
      setTabItemRefs(tabItemRefs);
    };
  };

  return (
    <Container pt="lg">
      <Stack>
        <Title order={2}>{dataset.name}</Title>
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
              <Tabs.Tab
                value="dataset-edit"
                ref={tabItemRefCallback("dataset-edit")}
              >
                <Text span>Edit Dataset</Text>
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
                  data={dataset}
                  excludeKeys={EXCLUDED_DATASET_METADATA_KEYS}
                  childRenderOptions={DATASET_METADATA_RENDER_OPTIONS}
                />

                <Title order={5}>Data preview</Title>
                {parsedDataset ?
                  <DataGrid
                    columnNames={datasetColumnNames}
                    data={previewData}
                  />
                : null}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="dataset-summary">
              {isLoadingParsedDataset || !parsedDataset ?
                <Loader />
              : <DataSummaryView parsedDataset={parsedDataset} />}
            </Tabs.Panel>

            <Tabs.Panel value="dataset-edit">
              {isLoadingParsedDataset ?
                <Loader />
              : <EditDatasetView dataset={dataset} />}
            </Tabs.Panel>

            <Button
              color="danger"
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
                    deleteLocalDataset(
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
