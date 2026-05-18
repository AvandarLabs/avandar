import {
  Box,
  Button,
  Flex,
  Group,
  LoadingOverlay,
  MantineTheme,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconChevronDown,
  IconDownload,
  IconFolderOpen,
  IconInfoCircle,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { notifyError, notifySuccess, Tooltip } from "@ui";
import { useEffect, useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { VizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsForm";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { downloadRowsAsCSV } from "@/views/DataExplorerApp/downloadRowsAsCSV";
import { GeneratedPromptBadge } from "@/views/DataExplorerApp/GeneratedPromptBadge/GeneratedPromptBadge";
import { OpenDatasetModal } from "@/views/DataExplorerApp/OpenDatasetModal/OpenDatasetModal";
import { QueryForm } from "@/views/DataExplorerApp/QueryForm/QueryForm";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import { useDataExplorerURLSync } from "@/views/DataExplorerApp/useDataExplorerURLSync";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import type { DataExplorerURLSearch } from "@/views/DataExplorerApp/DataExplorerURLState";

const QUERY_FORM_WIDTH = 300;

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

  // Mirror useDataQuery's runtime error onto state so the chat panel can
  // show a "Regenerate with the error" affordance when the auto-applied SQL
  // turned out to be invalid.
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
  const queryResultData = queryResults?.data ?? [];
  const dateColumns = getDateColumns(queryResultColumns, queryResultData);

  return (
    <AppLayout title="Data Explorer">
      <Flex>
        <Box
          bg="neutral.0"
          miw={QUERY_FORM_WIDTH}
          w={QUERY_FORM_WIDTH}
          mih="100dvh"
          mah="100vh"
          style={styles.queryFormContainer}
        >
          <QueryForm />
          <VizSettingsForm
            columns={queryResultColumns}
            data={queryResultData}
            vizConfig={state.vizConfig}
            onVizConfigChange={dispatch.setVizConfig}
            onVizTypeChange={dispatch.setActiveVizType}
          />
        </Box>

        <Stack flex={1} gap={0}>
          <Group
            bg="white"
            py="xs"
            w="100%"
            justify="flex-end"
            px="md"
            style={styles.toolbar}
          >
            <Button
              variant="subtle"
              color="neutral"
              leftSection={<IconRotateClockwise size={16} />}
              size="compact-sm"
              onClick={() => {
                dispatch.resetState();
                navigate({ search: {}, replace: true });
              }}
            >
              Reset
            </Button>
            <Button
              variant="outline"
              color="neutral"
              leftSection={<IconFolderOpen size={16} />}
              size="compact-sm"
              onClick={() => {
                modals.open({
                  title: "Open Dataset",
                  size: "lg",
                  children: (
                    <OpenDatasetModal
                      onOpen={(info, rawSQL) => {
                        dispatch.setRawSql(rawSQL);
                        dispatch.setOpenDataset(info);
                      }}
                    />
                  ),
                });
              }}
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
                    <Menu.Item
                      disabled={!state.rawSQL || isSavingOver}
                      onClick={() => {
                        if (!state.rawSQL || !state.openDataset) {
                          return;
                        }
                        saveOverDataset({
                          id: state.openDataset.virtualDatasetId,
                          data: { rawSQL: state.rawSQL },
                        });
                      }}
                    >
                      Save — {state.openDataset.name}
                    </Menu.Item>
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
          <Box flex={1} pos="relative" w="100%" h="100%" bg="white">
            <LoadingOverlay visible={isLoadingResults} zIndex={99} />
            <VisualizationContainer
              columns={queryResultColumns}
              data={queryResultData}
              dateColumns={dateColumns}
              vizConfig={state.vizConfig}
            />
          </Box>
        </Stack>
      </Flex>
    </AppLayout>
  );
}

const styles = {
  queryFormContainer: (theme: MantineTheme) => {
    return {
      borderRight: `1px solid ${theme.colors.neutral[2]}`,
      overflowY: "auto",
    };
  },
  toolbar: (theme: MantineTheme) => {
    return {
      borderBottom: `1px solid ${theme.colors.neutral[2]}`,
    };
  },
};
