import { Trans, useLingui } from "@lingui/react/macro";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { FloatingPanel } from "@/components/FloatingPanel/FloatingPanel";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { VizSettingsForm } from "@/components/VisualizationContainer/VizSettingsForm/VizSettingsForm";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import {
  DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY,
  hasDataExplorerPanelPreferencesInSessionStorage,
  readDataExplorerPanelPreferences,
  writeDataExplorerPanelPreferences,
} from "@/views/DataExplorerApp/dataExplorerPanelPreferences/dataExplorerPanelPreferences";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import { downloadRowsAsCSV } from "@/views/DataExplorerApp/downloadRowsAsCSV";
import { formatOfflineQueryError } from "@/views/DataExplorerApp/formatOfflineQueryError/formatOfflineQueryError";
import { GeneratedPromptBanner } from "@/views/DataExplorerApp/GeneratedPromptBanner/GeneratedPromptBanner";
import { OpenDatasetModal } from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal";
import { QueryDetailsBody } from "@/views/DataExplorerApp/QueryDetailsBody/QueryDetailsBody";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import { useDataExplorerUrlSync } from "@/views/DataExplorerApp/useDataExplorerUrlSync";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import { useSyncLargeDatasetAutoLimit } from "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit";
import type { DataExplorerPanelPreferences } from "@/views/DataExplorerApp/dataExplorerPanelPreferences/dataExplorerPanelPreferences";
import type { DataExplorerUrlSearch } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { ReactNode } from "react";

const QUERY_DETAILS_WIDTH = 380;
const VISUALIZATION_SETTINGS_WIDTH = 340;

/**
 * Default stacked layout: Query Details near the top-left of the canvas
 * with Visualization Settings below it. Both anchor to the left edge so
 * they share the same column.
 */
const QUERY_DETAILS_INITIAL_POSITION = { top: 140, left: 32 };
const VISUALIZATION_SETTINGS_INITIAL_POSITION = { top: 540, left: 32 };

/** Defaults applied when there is no saved per-tab preference. */
const DEFAULT_QUERY_DETAILS_OPENED = true;
const DEFAULT_VISUALIZATION_SETTINGS_OPENED = false;

function _updatePanelPreferences(
  preferences: DataExplorerPanelPreferences,
  panel: "queryDetails" | "settings",
  nextPreference: DataExplorerPanelPreferences["queryDetails"],
): DataExplorerPanelPreferences {
  return {
    ...preferences,
    [panel]: {
      ...preferences[panel],
      ...nextPreference,
    },
  };
}

type Props = {
  urlSearch: DataExplorerUrlSearch;
  navigate: (options: {
    search: DataExplorerUrlSearch;
    replace: boolean;
  }) => void;
};

export function DataExplorerApp({ urlSearch, navigate }: Props): ReactNode {
  const { t } = useLingui();
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const [, chatPanelDispatch] = ChatPanelStateManager.useContext();
  const [
    isOpenDatasetModalOpen,
    { open: openOpenDatasetModal, close: closeOpenDatasetModal },
  ] = useDisclosure(false);
  const [panelPreferences, setPanelPreferences] =
    useState<DataExplorerPanelPreferences>(() => {
      return readDataExplorerPanelPreferences();
    });

  const isQueryDetailsOpened =
    panelPreferences.queryDetails?.opened ?? DEFAULT_QUERY_DETAILS_OPENED;
  const isVisualizationSettingsOpened =
    panelPreferences.settings?.opened ?? DEFAULT_VISUALIZATION_SETTINGS_OPENED;
  const isQueryDetailsCollapsed =
    panelPreferences.queryDetails?.collapsed ?? false;
  const isVisualizationSettingsCollapsed =
    panelPreferences.settings?.collapsed ?? false;

  const setQueryDetailsOpened = useCallback(
    (next: boolean | ((prev: boolean) => boolean)): void => {
      setPanelPreferences((prev) => {
        const current =
          prev.queryDetails?.opened ?? DEFAULT_QUERY_DETAILS_OPENED;
        const resolved = typeof next === "function" ? next(current) : next;
        return _updatePanelPreferences(prev, "queryDetails", {
          opened: resolved,
        });
      });
    },
    [],
  );

  const setVisualizationSettingsOpened = useCallback(
    (next: boolean | ((prev: boolean) => boolean)): void => {
      setPanelPreferences((prev) => {
        const current =
          prev.settings?.opened ?? DEFAULT_VISUALIZATION_SETTINGS_OPENED;
        const resolved = typeof next === "function" ? next(current) : next;
        return _updatePanelPreferences(prev, "settings", { opened: resolved });
      });
    },
    [],
  );

  useEffect(() => {
    writeDataExplorerPanelPreferences(panelPreferences);
  }, [panelPreferences]);

  useDataExplorerUrlSync({ urlSearch, navigate });

  const [saveOverDataset, isSavingOver] = VirtualDatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`Dataset saved.`);
    },
    onError: (error) => {
      notifyError(t`Failed to save dataset: ${error.message}`);
    },
  });

  const [deleteDataset, isDeletingDataset] = DatasetClient.useFullDelete({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      dispatch.setOpenDataset(undefined);
      dispatch.setRawSql(undefined);
      notifySuccess(t`Dataset deleted.`);
    },
    onError: (error) => {
      notifyError(t`Failed to delete dataset: ${error.message}`);
    },
  });

  const workspace = useCurrentWorkspace();
  const applyLargeDatasetAutoLimit = useCallback(
    (limit: number) => {
      if (state.query.limit === limit) {
        return;
      }
      dispatch.setLimit(limit);
    },
    [dispatch, state.query.limit],
  );

  useSyncLargeDatasetAutoLimit({
    query: state.query,
    rawSql: state.rawSql,
    onApplyAutoLimit: applyLargeDatasetAutoLimit,
  });

  const [queryResults, isLoadingResults, dataQuery] = useDataQuery({
    query: state.query,
    rawSql: state.rawSql,
    isStructuredQueryInSync: state.isStructuredQueryInSync,
    auth: "workspace",
    workspaceId: workspace.id,
  });

  useEffect(
    function syncLastQueryError() {
      const message =
        dataQuery.isError ?
          (formatOfflineQueryError(dataQuery.error) ?? dataQuery.error.message)
        : undefined;
      if (message !== state.lastQueryError) {
        dispatch.setLastQueryError(message);
      }
    },
    [dataQuery.isError, dataQuery.error, state.lastQueryError, dispatch],
  );
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
      rawSql: state.rawSql,
      dataSource: state.query.dataSource,
      orderByColumn: state.query.orderByColumn,
      orderByDirection: state.query.orderByDirection,
    });
  }, [
    state.query.queryColumns,
    state.rawSql,
    state.query.dataSource,
    state.query.orderByColumn,
    state.query.orderByDirection,
  ]);

  useEffect(() => {
    if (!isLoadingResults && queryResults?.columns) {
      dispatch.syncVizFromQueryResult(queryResults.columns);
    }
  }, [
    isLoadingResults,
    columnSignature,
    querySyncSignature,
    state.vizConfig.vizType,
    queryResults,
    dispatch,
  ]);

  const queryPanelButtonRef = useRef<HTMLButtonElement>(null);
  const visualizationSettingsPanelButtonRef = useRef<HTMLButtonElement>(null);
  const wasFetchingRef = useRef(false);
  /**
   * Auto-open settings once on the first successful query when nothing is in
   * session storage yet.
   */
  const hasAutoOpenedVisualizationSettingsRef = useRef(
    hasDataExplorerPanelPreferencesInSessionStorage(),
  );
  useEffect(() => {
    const justFinishedFetching =
      wasFetchingRef.current && !dataQuery.isFetching;
    if (
      justFinishedFetching &&
      dataQuery.isSuccess &&
      !hasAutoOpenedVisualizationSettingsRef.current
    ) {
      setVisualizationSettingsOpened(true);
      hasAutoOpenedVisualizationSettingsRef.current = true;
    }
    wasFetchingRef.current = dataQuery.isFetching;
  }, [
    dataQuery.isFetching,
    dataQuery.isSuccess,
    setVisualizationSettingsOpened,
  ]);

  useEffect(
    function openChatPanelOnMount() {
      const alreadyOpened = sessionStorage.getItem(
        DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY,
      );
      if (!alreadyOpened) {
        chatPanelDispatch.open();
        sessionStorage.setItem(DATA_EXPLORER_AI_PANEL_AUTO_OPENED_KEY, "true");
      }
    },
    [chatPanelDispatch],
  );

  const queryResultData = queryResults?.data ?? [];
  const dateColumns = getDateColumns(queryResultColumns, queryResultData);

  return (
    <AppLayout title={t`Data Explorer`}>
      <Stack flex={1} h="100%" gap={0} mih={0}>
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
            <Trans>Reset</Trans>
          </Button>
          <Button
            ref={queryPanelButtonRef}
            variant={isQueryDetailsOpened ? "filled" : "outline"}
            color="neutral"
            leftSection={<IconListDetails size={16} />}
            size="compact-sm"
            onClick={() => {
              setQueryDetailsOpened((prev) => {
                return !prev;
              });
            }}
          >
            <Trans>Query</Trans>
          </Button>
          <Button
            ref={visualizationSettingsPanelButtonRef}
            variant={isVisualizationSettingsOpened ? "filled" : "outline"}
            color="neutral"
            leftSection={<IconAdjustmentsHorizontal size={16} />}
            size="compact-sm"
            onClick={() => {
              setVisualizationSettingsOpened((prev) => {
                return !prev;
              });
            }}
          >
            <Trans>Visualizations</Trans>
          </Button>
          <Button
            variant="outline"
            color="neutral"
            leftSection={<IconFolderOpen size={16} />}
            size="compact-sm"
            onClick={openOpenDatasetModal}
          >
            <Trans>Open</Trans>
          </Button>
          <Menu shadow="md" width={240}>
            <Menu.Target>
              <Button
                variant="outline"
                color="neutral"
                size="compact-sm"
                rightSection={<IconChevronDown size={16} />}
              >
                <Trans>Save</Trans>
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {state.openDataset ?
                <>
                  {state.openDataset.virtualDatasetId ?
                    <Menu.Item
                      disabled={!state.rawSql || isSavingOver}
                      onClick={() => {
                        const virtualDatasetId =
                          state.openDataset?.virtualDatasetId;
                        if (!state.rawSql || !virtualDatasetId) {
                          return;
                        }
                        saveOverDataset({
                          id: virtualDatasetId,
                          data: { rawSql: state.rawSql },
                        });
                      }}
                    >
                      <Trans>Save — {state.openDataset.name}</Trans>
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
                        title: t`Delete dataset`,
                        children: (
                          <Text size="sm">
                            <Trans>
                              Permanently delete{" "}
                              <strong>{state.openDataset.name}</strong>?
                            </Trans>
                          </Text>
                        ),
                        labels: {
                          confirm: t`Delete`,
                          cancel: t`Cancel`,
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
                    <Trans>Delete — {state.openDataset.name}</Trans>
                  </Menu.Item>
                  <Menu.Divider />
                </>
              : null}
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || state.rawSql === undefined
                }
                rightSection={
                  state.rawSql === undefined ?
                    <Tooltip label={t`Run an AI query first.`}>
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!state.rawSql) {
                    return;
                  }
                  const modalId = modals.open({
                    title: t`Save as new dataset`,
                    size: "xl",
                    children: (
                      <SaveAsNewDatasetForm
                        queryResultData={queryResultData}
                        columns={queryResultColumns}
                        dateColumns={dateColumns}
                        rawSql={state.rawSql}
                        onSaveSuccess={() => {
                          modals.close(modalId);
                        }}
                      />
                    ),
                  });
                }}
              >
                <Trans>Save as new dataset</Trans>
              </Menu.Item>
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || state.rawSql === undefined
                }
                rightSection={
                  state.rawSql === undefined ?
                    <Tooltip label={t`Run an AI query first.`}>
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!state.rawSql) {
                    return;
                  }
                  const modalId = modals.open({
                    withCloseButton: true,
                    size: "lg",
                    children: (
                      <SaveToDashboardModal
                        rawSql={state.rawSql}
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
                <Trans>Save to dashboard</Trans>
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
            <Trans>Export</Trans>
          </Button>
        </Group>
        <GeneratedPromptBanner />
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
        title={t`Query Details`}
        opened={isQueryDetailsOpened}
        collapsed={isQueryDetailsCollapsed}
        openOriginRef={queryPanelButtonRef}
        onClose={() => {
          setQueryDetailsOpened(false);
        }}
        onRequestClose={() => {
          setQueryDetailsOpened(false);
        }}
        onToggleCollapse={() => {
          setPanelPreferences((prev) => {
            return _updatePanelPreferences(prev, "queryDetails", {
              collapsed: !isQueryDetailsCollapsed,
            });
          });
        }}
        onPositionChange={(position) => {
          setPanelPreferences((prev) => {
            return _updatePanelPreferences(prev, "queryDetails", {
              position: {
                left: position.x,
                top: position.y,
              },
            });
          });
        }}
        initialPosition={
          panelPreferences.queryDetails?.position ??
          QUERY_DETAILS_INITIAL_POSITION
        }
        width={QUERY_DETAILS_WIDTH}
      >
        <QueryDetailsBody />
      </FloatingPanel>
      <FloatingPanel
        title={t`Visualization Settings`}
        opened={isVisualizationSettingsOpened}
        collapsed={isVisualizationSettingsCollapsed}
        openOriginRef={visualizationSettingsPanelButtonRef}
        onClose={() => {
          setVisualizationSettingsOpened(false);
        }}
        onRequestClose={() => {
          setVisualizationSettingsOpened(false);
        }}
        onToggleCollapse={() => {
          setPanelPreferences((prev) => {
            return _updatePanelPreferences(prev, "settings", {
              collapsed: !isVisualizationSettingsCollapsed,
            });
          });
        }}
        onPositionChange={(position) => {
          setPanelPreferences((prev) => {
            return _updatePanelPreferences(prev, "settings", {
              position: {
                left: position.x,
                top: position.y,
              },
            });
          });
        }}
        initialPosition={
          panelPreferences.settings?.position ??
          VISUALIZATION_SETTINGS_INITIAL_POSITION
        }
        width={VISUALIZATION_SETTINGS_WIDTH}
      >
        <VizSettingsForm
          columns={queryResultColumns}
          data={queryResultData}
          vizConfig={state.vizConfig}
          onVizConfigChange={dispatch.setVizConfig}
          onVizTypeChange={dispatch.setActiveVizType}
        />
      </FloatingPanel>
      <OpenDatasetModal
        opened={isOpenDatasetModalOpen}
        onClose={closeOpenDatasetModal}
        onOpen={(info, rawSql) => {
          dispatch.setRawSql(rawSql);
          dispatch.setOpenDataset(info);
          closeOpenDatasetModal();
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
