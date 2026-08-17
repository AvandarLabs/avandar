import { Trans, useLingui } from "@lingui/react/macro";
import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  MantineTheme,
  Stack,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconDownload,
  IconFolderOpen,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerDrawer } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import { DataExplorerSaveMenu } from "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu";
import { DataExplorerSessionKeys } from "@/views/DataExplorerApp/DataExplorerSessionKeys";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import { downloadRowsAsCsv } from "@/views/DataExplorerApp/downloadRowsAsCsv";
import { formatOfflineQueryError } from "@/views/DataExplorerApp/formatOfflineQueryError/formatOfflineQueryError";
import { GeneratedPromptBanner } from "@/views/DataExplorerApp/GeneratedPromptBanner/GeneratedPromptBanner";
import { OpenDatasetModal } from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import { useDataExplorerUrlSync } from "@/views/DataExplorerApp/useDataExplorerUrlSync";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
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
    analyticsSurface: "data_explorer",
    analyticsTrigger: state.queryTrigger,
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

  // The last query completion already announced to the tutorial, so a re-render
  // or a new `queryResults` identity for the same run cannot announce it twice.
  const announcedQueryAtRef = useRef<number | undefined>(undefined);
  useEffect(
    function announceSuccessfulQueryToNux() {
      // Advances the onboarding tutorial's `run_query` milestone, which is
      // meant to reward the user for ASKING something. So the trigger matters
      // as much as the result: `url_hydration` and `dataset_opened` run a
      // `select *` on their own the moment the tutorial routes here with a
      // `ds` search param, and counting that would mark the milestone done,
      // and skip the tooltip that asks the question, before the user typed
      // anything.
      // Rows, not just a successful request: an empty result is not an answer.
      const isUserAskedQuestion =
        state.queryTrigger !== "url_hydration" &&
        state.queryTrigger !== "dataset_opened";
      if (
        isUserAskedQuestion &&
        !isLoadingResults &&
        !dataQuery.isError &&
        (queryResults?.data?.length ?? 0) > 0 &&
        announcedQueryAtRef.current !== dataQuery.dataUpdatedAt
      ) {
        announcedQueryAtRef.current = dataQuery.dataUpdatedAt;
        NuxEvents.emit("query.succeeded", {});
      }
    },
    [
      isLoadingResults,
      dataQuery.isError,
      dataQuery.dataUpdatedAt,
      queryResults,
      state.queryTrigger,
    ],
  );

  const queryResultColumns = queryResults?.columns ?? [];

  // The SQL behind whatever is currently on screen, whether it came from the
  // chat panel, the SQL editor, or the guided query builder.
  //
  // Do not gate the save actions on `state.rawSql` instead: the builder
  // generates its SQL inside `selectSqlToExecute` at execution time and never
  // stores it, so a chart built that way would have no `rawSql` and could not
  // be saved.
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
          <DataExplorerSaveMenu
            savableSql={savableSql}
            queryResultData={queryResultData}
            queryResultColumns={queryResultColumns}
            dateColumns={dateColumns}
            workspaceSlug={workspace.slug}
          />
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
          {...NuxAnchors.props(NuxAnchors.ids.explorerCanvas)}
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
          dispatch.setQueryTrigger("dataset_opened");
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
