import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  MantineTheme,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconDownload,
  IconFolderOpen,
  IconInfoCircle,
  IconListDetails,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { notifyError, notifySuccess, Tooltip } from "@ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { PlanFlowView } from "@/components/ChatPanel/PlanFlowView/PlanFlowView";
import { FloatingPanel } from "@/components/FloatingPanel/FloatingPanel";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { VizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsForm";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerURLState";
import { downloadRowsAsCSV } from "@/views/DataExplorerApp/downloadRowsAsCSV";
import { GeneratedPromptBadge } from "@/views/DataExplorerApp/GeneratedPromptBadge/GeneratedPromptBadge";
import { OpenDatasetDrawer } from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetDrawer";
import { QueryDetailsBody } from "@/views/DataExplorerApp/QueryDetailsBody/QueryDetailsBody";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import { useDataExplorerURLSync } from "@/views/DataExplorerApp/useDataExplorerURLSync";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { DataExplorerURLSearch } from "@/views/DataExplorerApp/DataExplorerURLState";

const QUERY_DETAILS_INITIAL_POSITION = { top: 140, left: 32 };
const SETTINGS_INITIAL_POSITION = { top: 140, right: 32 };
const QUERY_DETAILS_WIDTH = 380;
const SETTINGS_WIDTH = 340;

type Props = {
  urlSearch: DataExplorerURLSearch;
  navigate: (options: {
    search: DataExplorerURLSearch;
    replace: boolean;
  }) => void;
};

export function DataExplorerApp({ urlSearch, navigate }: Props): JSX.Element {
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const [
    isOpenDatasetDrawerOpen,
    { open: openOpenDatasetDrawer, close: closeOpenDatasetDrawer },
  ] = useDisclosure(false);

  const [isQueryDetailsOpened, setQueryDetailsOpened] = useState(false);
  const [isQueryDetailsCollapsed, setQueryDetailsCollapsed] = useState(false);
  const [isSettingsOpened, setSettingsOpened] = useState(false);
  const [isSettingsCollapsed, setSettingsCollapsed] = useState(false);

  useDataExplorerURLSync({ urlSearch, navigate });

  const [saveOverDataset, isSavingOver] = VirtualDatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess("Dataset saved.");
    },
    onError: (error) => {
      notifyError(`Failed to save dataset: ${error.message}`);
    },
  });

  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      dispatch.setOpenDataset(undefined);
      dispatch.setRawSql(undefined);
      notifySuccess("Dataset deleted.");
    },
    onError: (error) => {
      notifyError(`Failed to delete dataset: ${error.message}`);
    },
  });

  const workspace = useCurrentWorkspace();
  const [queryResults, isLoadingResults, dataQuery] = useDataQuery({
    query: state.query,
    rawSQL: state.rawSQL,
    auth: "workspace",
    workspaceId: workspace.id,
  });

  useEffect(() => {
    const message =
      dataQuery.isError ?
        dataQuery.error instanceof Error ?
          dataQuery.error.message
        : String(dataQuery.error)
      : undefined;
    if (message !== state.lastQueryError) {
      dispatch.setLastQueryError(message);
    }
  }, [dataQuery.isError, dataQuery.error, state.lastQueryError, dispatch]);
  const queryResultColumns = queryResults?.columns ?? [];

  const columnSignature = useMemo(() => {
    if (!queryResults) {
      return "";
    }

    return queryResults.columns
      .map((col) => {
        return `${col.name}:${col.dataType}`;
      })
      .join("|");
  }, [queryResults]);

  const querySyncSignature = useMemo(() => {
    return JSON.stringify({
      queryColumns: state.query.queryColumns,
      rawSQL: state.rawSQL,
      dataSource: state.query.dataSource,
      orderByColumn: state.query.orderByColumn,
      orderByDirection: state.query.orderByDirection,
    });
  }, [
    state.query.queryColumns,
    state.rawSQL,
    state.query.dataSource,
    state.query.orderByColumn,
    state.query.orderByDirection,
  ]);

  useEffect(() => {
    if (isLoadingResults) {
      return;
    }

    if (!queryResults) {
      return;
    }

    dispatch.syncVizFromQueryResult(queryResults.columns);
  }, [
    isLoadingResults,
    columnSignature,
    querySyncSignature,
    state.vizConfig.vizType,
    queryResults,
    dispatch,
  ]);

  const wasFetchingRef = useRef(false);
  const isSettingsOpenedRef = useRef(isSettingsOpened);
  isSettingsOpenedRef.current = isSettingsOpened;
  useEffect(() => {
    const justFinishedFetching =
      wasFetchingRef.current && !dataQuery.isFetching;
    if (justFinishedFetching && dataQuery.isSuccess) {
      if (!isSettingsOpenedRef.current) {
        setSettingsCollapsed(false);
      }
      setSettingsOpened(true);
    }
    wasFetchingRef.current = dataQuery.isFetching;
  }, [dataQuery.isFetching, dataQuery.isSuccess]);

  const queryResultData = queryResults?.data ?? [];
  const dateColumns = getDateColumns(queryResultColumns, queryResultData);

  return (
    <AppLayout title="Data Explorer">
      <Stack flex={1} gap={0} mih={0}>
        <Group
          bg="white"
          py="xs"
          w="100%"
          justify="flex-end"
          px="md"
          pos="relative"
          style={styles.toolbar}
        >
          <Button
            variant="subtle"
            color="neutral"
            leftSection={<IconRotateClockwise size={16} />}
            size="compact-sm"
            onClick={() => {
              dispatch.resetState();
              navigate({ search: EMPTY_EXPLORER_URL_SEARCH, replace: true });
            }}
          >
            Reset
          </Button>
          <Button
            variant={isQueryDetailsOpened ? "filled" : "outline"}
            color="neutral"
            leftSection={<IconListDetails size={16} />}
            size="compact-sm"
            onClick={() => {
              setQueryDetailsOpened((prev) => {
                return !prev;
              });
              setQueryDetailsCollapsed(false);
            }}
          >
            Show query details
          </Button>
          <Button
            variant={isSettingsOpened ? "filled" : "outline"}
            color="neutral"
            leftSection={<IconAdjustmentsHorizontal size={16} />}
            size="compact-sm"
            onClick={() => {
              setSettingsOpened((prev) => {
                return !prev;
              });
              setSettingsCollapsed(false);
            }}
          >
            Settings
          </Button>
          <Button
            variant="outline"
            color="neutral"
            leftSection={<IconFolderOpen size={16} />}
            size="compact-sm"
            onClick={openOpenDatasetDrawer}
          >
            Open
          </Button>
          <Menu shadow="md" width={240}>
            <Menu.Target>
              <Button
                variant="outline"
                color="neutral"
                size="compact-sm"
                rightSection={<IconChevronDown size={16} />}
              >
                Save
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {state.openDataset ?
                <>
                  {state.openDataset.virtualDatasetId ?
                    <Menu.Item
                      disabled={!state.rawSQL || isSavingOver}
                      onClick={() => {
                        const virtualDatasetId =
                          state.openDataset?.virtualDatasetId;
                        if (!state.rawSQL || !virtualDatasetId) {
                          return;
                        }
                        saveOverDataset({
                          id: virtualDatasetId,
                          data: { rawSQL: state.rawSQL },
                        });
                      }}
                    >
                      Save — {state.openDataset.name}
                    </Menu.Item>
                  : null}
                  <Menu.Item
                    color="red"
                    disabled={isDeletingDataset}
                    onClick={() => {
                      if (!state.openDataset) {
                        return;
                      }
                      modals.openConfirmModal({
                        title: "Delete dataset",
                        children: (
                          <Text size="sm">
                            Permanently delete{" "}
                            <strong>{state.openDataset.name}</strong>?
                          </Text>
                        ),
                        labels: {
                          confirm: "Delete",
                          cancel: "Cancel",
                        },
                        confirmProps: { color: "red" },
                        onConfirm: () => {
                          if (!state.openDataset) {
                            return;
                          }
                          deleteDataset({
                            id: state.openDataset.datasetId,
                          });
                        },
                      });
                    }}
                  >
                    Delete — {state.openDataset.name}
                  </Menu.Item>
                  <Menu.Divider />
                </>
              : null}
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || state.rawSQL === undefined
                }
                rightSection={
                  state.rawSQL === undefined ?
                    <Tooltip label="Run an AI query first.">
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!state.rawSQL) {
                    return;
                  }
                  const modalId = modals.open({
                    title: "Save as new dataset",
                    size: "xl",
                    children: (
                      <SaveAsNewDatasetForm
                        queryResultData={queryResultData}
                        columns={queryResultColumns}
                        dateColumns={dateColumns}
                        rawSQL={state.rawSQL}
                        onSaveSuccess={() => {
                          modals.close(modalId);
                        }}
                      />
                    ),
                  });
                }}
              >
                Save as new dataset
              </Menu.Item>
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || state.rawSQL === undefined
                }
                rightSection={
                  state.rawSQL === undefined ?
                    <Tooltip label="Run an AI query first.">
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!state.rawSQL) {
                    return;
                  }
                  const modalId = modals.open({
                    withCloseButton: true,
                    size: "lg",
                    children: (
                      <SaveToDashboardModal
                        rawSQL={state.rawSQL}
                        prompt={state.nlPrompt}
                        vizType={state.vizConfig.vizType}
                        vizConfig={state.vizConfig}
                        workspaceSlug={workspace.slug}
                        onClose={() => {
                          modals.close(modalId);
                        }}
                      />
                    ),
                  });
                }}
              >
                Save to dashboard
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button
            variant="outline"
            color="neutral"
            leftSection={<IconDownload size={16} />}
            size="compact-sm"
            disabled={isLoadingResults || queryResultData.length === 0}
            onClick={() => {
              downloadRowsAsCSV(queryResultData);
            }}
          >
            Export
          </Button>
        </Group>
        <GeneratedPromptBadge />
        <PlanFlowView />
        <Box flex={1} pos="relative" w="100%" mih={0} bg="white">
          <LoadingOverlay visible={isLoadingResults} zIndex={99} />
          <VisualizationContainer
            columns={queryResultColumns}
            data={queryResultData}
            dateColumns={dateColumns}
            vizConfig={state.vizConfig}
          />
        </Box>
      </Stack>
      <FloatingPanel
        title="Query Details"
        opened={isQueryDetailsOpened}
        collapsed={isQueryDetailsCollapsed}
        onClose={() => {
          setQueryDetailsOpened(false);
        }}
        onToggleCollapse={() => {
          setQueryDetailsCollapsed((prev) => {
            return !prev;
          });
        }}
        initialPosition={QUERY_DETAILS_INITIAL_POSITION}
        width={QUERY_DETAILS_WIDTH}
      >
        <QueryDetailsBody />
      </FloatingPanel>
      <FloatingPanel
        title="Visualization Settings"
        opened={isSettingsOpened}
        collapsed={isSettingsCollapsed}
        onClose={() => {
          setSettingsOpened(false);
        }}
        onToggleCollapse={() => {
          setSettingsCollapsed((prev) => {
            return !prev;
          });
        }}
        initialPosition={SETTINGS_INITIAL_POSITION}
        width={SETTINGS_WIDTH}
      >
        <VizSettingsForm
          columns={queryResultColumns}
          data={queryResultData}
          vizConfig={state.vizConfig}
          onVizConfigChange={dispatch.setVizConfig}
          onVizTypeChange={dispatch.setActiveVizType}
        />
      </FloatingPanel>
      <OpenDatasetDrawer
        opened={isOpenDatasetDrawerOpen}
        onClose={closeOpenDatasetDrawer}
        onOpen={(info, rawSQL) => {
          dispatch.setRawSql(rawSQL);
          dispatch.setOpenDataset(info);
          closeOpenDatasetDrawer();
        }}
      />
    </AppLayout>
  );
}

const styles = {
  toolbar: (theme: MantineTheme) => {
    return {
      borderBottom: `1px solid ${theme.colors.neutral[2]}`,
      flexShrink: 0,
      zIndex: 2,
    };
  },
};
