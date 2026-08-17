import { Tooltip } from "@avandar/ui";
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
  IconChevronDown,
  IconDownload,
  IconFolderOpen,
  IconInfoCircle,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { VirtualDatasetClient } from "@/clients/datasets/source-datasets/VirtualDatasetClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { NuxAnchors, nuxAnchorProps } from "@/components/Nux/nuxAnchors";
import { NuxEvents } from "@/components/Nux/nuxEvents";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DataExplorerDrawer } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import { DataExplorerSessionKeys } from "@/views/DataExplorerApp/DataExplorerSessionKeys";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import { downloadRowsAsCsv } from "@/views/DataExplorerApp/downloadRowsAsCsv";
import { formatOfflineQueryError } from "@/views/DataExplorerApp/formatOfflineQueryError/formatOfflineQueryError";
import { GeneratedPromptBanner } from "@/views/DataExplorerApp/GeneratedPromptBanner/GeneratedPromptBanner";
import { OpenDatasetModal } from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal";
import { SaveAsNewDatasetForm } from "@/views/DataExplorerApp/SaveAsNewDatasetForm/SaveAsNewDatasetForm";
import { SaveToDashboardModal } from "@/views/DataExplorerApp/SaveToDashboardModal/SaveToDashboardModal";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import { useDataExplorerUrlSync } from "@/views/DataExplorerApp/useDataExplorerUrlSync";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery";
import { useSyncLargeDatasetAutoLimit } from "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit";
import type { DataExplorerUrlSearch } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { ReactNode } from "react";

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
  const chartRef = useRef<HTMLDivElement>(null);

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

  useEffect(
    function announceSuccessfulQueryToNux() {
      if (isLoadingResults || dataQuery.isError) {
        return;
      }
      if ((queryResults?.data?.length ?? 0) === 0) {
        return;
      }
      // Advances the onboarding tutorial's second milestone. Rows, not just a
      // successful request: an empty result is not an answer.
      NuxEvents.emit("query.succeeded", {});
    },
    [isLoadingResults, dataQuery.isError, queryResults],
  );

  const queryResultColumns = queryResults?.columns ?? [];

  /**
   * The SQL behind whatever is currently on screen, whether it came from the
   * chat panel, the SQL editor, or the guided query builder.
   *
   * `state.rawSql` alone is not enough: the builder generates its SQL inside
   * `selectSqlToExecute` at execution time and never stores it, so gating the
   * save actions on `rawSql` left a chart the user had just built with no way
   * to keep it.
   */
  const savableSql = selectSqlToExecute({
    rawSql: state.rawSql,
    isStructuredQueryInSync: state.isStructuredQueryInSync,
    executionQuery: state.query,
  });

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

  useEffect(
    function openChatPanelOnMount() {
      const alreadyOpened = sessionStorage.getItem(
        DataExplorerSessionKeys.aiPanelAutoOpened,
      );
      if (!alreadyOpened) {
        chatPanelDispatch.open();
        sessionStorage.setItem(
          DataExplorerSessionKeys.aiPanelAutoOpened,
          "true",
        );
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
                {...nuxAnchorProps(NuxAnchors.explorerSaveMenu)}
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
                      <Trans>Save: {state.openDataset.name}</Trans>
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
                    <Trans>Delete: {state.openDataset.name}</Trans>
                  </Menu.Item>
                  <Menu.Divider />
                </>
              : null}
              <Menu.Item
                disabled={
                  queryResultData.length === 0 || savableSql === undefined
                }
                rightSection={
                  savableSql === undefined ?
                    <Tooltip label={t`Run a query first.`}>
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!savableSql) {
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
                        rawSql={savableSql}
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
                  queryResultData.length === 0 || savableSql === undefined
                }
                rightSection={
                  savableSql === undefined ?
                    <Tooltip label={t`Run a query first.`}>
                      <IconInfoCircle size={16} />
                    </Tooltip>
                  : null
                }
                onClick={() => {
                  if (!savableSql) {
                    return;
                  }
                  const modalId = modals.open({
                    withCloseButton: true,
                    size: "lg",
                    children: (
                      <SaveToDashboardModal
                        rawSql={savableSql}
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
              downloadRowsAsCsv(queryResultData);
            }}
          >
            <Trans>Export</Trans>
          </Button>
        </Group>
        <GeneratedPromptBanner />
        <Box
          ref={chartRef}
          flex={1}
          pos="relative"
          w="100%"
          mih={0}
          bg="white"
          {...nuxAnchorProps(NuxAnchors.explorerCanvas)}
        >
          <LoadingOverlay visible={isLoadingResults} zIndex={99} />
          <VisualizationContainer
            columns={queryResultColumns}
            data={queryResultData}
            dateColumns={dateColumns}
            vizConfig={state.vizConfig}
          />
        </Box>
        <DataExplorerDrawer
          columns={queryResultColumns}
          data={queryResultData}
          chartRef={chartRef}
        />
      </Stack>
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
