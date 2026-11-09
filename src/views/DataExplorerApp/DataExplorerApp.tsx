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
import { makeProjectionDescriptorsFromSql } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromSql/makeProjectionDescriptorsFromSql";
import { makeProjectionDescriptorsFromStructuredQuery } from "$/models/queries/QueryResultColumnBindings/makeProjectionDescriptorsFromStructuredQuery/makeProjectionDescriptorsFromStructuredQuery";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { NuxEvents } from "@/components/Nux/NuxEvents/NuxEvents";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import { getDateColumns } from "@/components/VisualizationContainer/getDateColumns";
import { useCategorySplitChartInput } from "@/components/VisualizationContainer/useCategorySplitChartInput/useCategorySplitChartInput";
import { VisualizationContainer } from "@/components/VisualizationContainer/VisualizationContainer";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { PluginMenuSlot } from "@/lib/plugins/PluginMenuSlot/PluginMenuSlot";
import css from "@/views/DataExplorerApp/DataExplorerApp.module.css";
import { DataExplorerDrawer } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer";
import { DataExplorerSaveMenu } from "@/views/DataExplorerApp/DataExplorerSaveMenu/DataExplorerSaveMenu";
import { DataExplorerSessionKeys } from "@/views/DataExplorerApp/DataExplorerSessionKeys";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { EMPTY_EXPLORER_URL_SEARCH } from "@/views/DataExplorerApp/DataExplorerUrlState";
import { downloadRowsAsCsv } from "@/views/DataExplorerApp/downloadRowsAsCsv";
import { formatOfflineQueryError } from "@/views/DataExplorerApp/formatOfflineQueryError/formatOfflineQueryError";
import { GeneratedPromptBanner } from "@/views/DataExplorerApp/GeneratedPromptBanner/GeneratedPromptBanner";
import { OpenDatasetModal } from "@/views/DataExplorerApp/OpenDatasetDrawer/OpenDatasetModal";
import { QueryExplorerResultsChrome } from "@/views/DataExplorerApp/QueryExplorerResultsChrome";
import { selectSqlToExecute } from "@/views/DataExplorerApp/selectSqlToExecute/selectSqlToExecute";
import { useDataExplorerPluginContext } from "@/views/DataExplorerApp/useDataExplorerPluginContext/useDataExplorerPluginContext";
import { useDataExplorerUrlSync } from "@/views/DataExplorerApp/useDataExplorerUrlSync";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import { useQueryResultColumnBindings } from "@/views/DataExplorerApp/useQueryResultColumnBindings/useQueryResultColumnBindings";
import { useSyncLargeDatasetAutoLimit } from "@/views/DataExplorerApp/useSyncLargeDatasetAutoLimit/useSyncLargeDatasetAutoLimit";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { DataExplorerUrlSearch } from "@/views/DataExplorerApp/DataExplorerUrlState";
import type { UnknownDataFrame } from "@avandar/utils";
import type { ReactNode } from "react";

/** Stable stand-ins before a result arrives, so memoized values hold. */
const NO_COLUMNS: readonly QueryResult.ColumnWithId[] = [];
const NO_ROWS: UnknownDataFrame = [];

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
      const message = dataQuery.isError
        ? (formatOfflineQueryError(dataQuery.error) ?? dataQuery.error.message)
        : undefined;
      if (message !== state.lastQueryError) {
        dispatch.setLastQueryError(message);
      }
    },
    [dataQuery.isError, dataQuery.error, state.lastQueryError, dispatch],
  );

  const announcedQueryAtRef = useRef<number | undefined>(undefined);
  useEffect(
    function announceSettledQuery() {
      if (
        isLoadingResults ||
        !dataQuery.isSuccess ||
        dataQuery.isError ||
        announcedQueryAtRef.current === dataQuery.dataUpdatedAt
      ) {
        return;
      }
      announcedQueryAtRef.current = dataQuery.dataUpdatedAt;
      NuxEvents.emit("query.succeeded", {
        trigger: state.queryTrigger,
        rowCount: queryResults?.data?.length ?? 0,
      });
    },
    [
      isLoadingResults,
      dataQuery.isSuccess,
      dataQuery.isError,
      dataQuery.dataUpdatedAt,
      queryResults,
      state.queryTrigger,
    ],
  );

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

  const columnBindingScope = useRef(crypto.randomUUID());
  const projections = useMemo(() => {
    const structured = state.isStructuredQueryInSync
      ? makeProjectionDescriptorsFromStructuredQuery(state.query)
      : [];
    return structured.length
      ? structured
      : makeProjectionDescriptorsFromSql({
          sql: savableSql ?? "",
          columns: queryResults?.columns ?? [],
        });
  }, [
    state.isStructuredQueryInSync,
    state.query,
    savableSql,
    queryResults?.columns,
  ]);
  const schema = useQueryResultColumnBindings({
    scopeKey: `${workspace.id}:${columnBindingScope.current}`,
    sqlKey: savableSql ?? "",
    resultSqlKey: queryResults?.executedSql,
    result: isLoadingResults ? undefined : queryResults,
    projections,
    initialRegistry: state.columnBindings,
  });
  const queryResultColumns = schema?.columns ?? NO_COLUMNS;
  useEffect(
    function synchronizeQueryResultColumnBindings() {
      if (schema && !isLoadingResults) {
        dispatch.syncVizFromQueryResult(schema.columns);
        if (schema.registry !== state.columnBindings) {
          dispatch.setColumnBindings(schema.registry);
        }
      }
    },
    [
      schema,
      isLoadingResults,
      dispatch,
      state.columnBindings,
      state.vizConfig.vizType,
    ],
  );

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

  const queryResultData = queryResults?.data ?? NO_ROWS;
  const pluginContext = useDataExplorerPluginContext({
    queryResults,
    isLoadingResults,
  });
  const dateColumns = useMemo(() => {
    return getDateColumns(queryResultColumns, queryResultData);
  }, [queryResultColumns, queryResultData]);
  // A long result drawn as a line, bar, or area chart shows one series per
  // category. Only the canvas sees this: the stored chart config, the table,
  // the drawer, and saving keep the result as the query returned it.
  const chartInput = useCategorySplitChartInput({
    columns: queryResultColumns,
    data: queryResultData,
    dateColumns,
    vizConfig: state.vizConfig,
  });

  useEffect(
    function publishExplorerQueryResultsForNux() {
      NuxStepFactsStore.setExplorerHasQueryResults(
        queryResultData.length > 0 && savableSql !== undefined,
      );
    },
    [queryResultData.length, savableSql],
  );

  useEffect(function clearExplorerQueryResultsForNuxOnUnmount() {
    return () => {
      NuxStepFactsStore.setExplorerHasQueryResults(false);
    };
  }, []);

  return (
    <AppSlate title={t`Data Explorer`}>
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
          <PluginMenuSlot
            slotId="dataExplorer.toolbar"
            getContext={pluginContext.getContext}
            facts={pluginContext.facts}
          />
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
        <QueryExplorerResultsChrome
          lastQueryError={state.lastQueryError}
          sql={state.rawSql}
          filters={state.query.filters}
        />
        <Box
          ref={chartRef}
          flex={1}
          pos="relative"
          w="100%"
          mih={0}
          bg="white"
          {...NuxAnchors.props(NuxAnchors.ids.explorerCanvas)}
        >
          <div
            {...NuxAnchors.props(NuxAnchors.ids.explorerCanvasTooltip)}
            className={css.canvasTooltipAnchor}
            aria-hidden
          />
          <LoadingOverlay visible={isLoadingResults} zIndex={99} />
          <VisualizationContainer
            rawColumns={queryResults?.columns}
            columns={chartInput.columns}
            data={chartInput.data}
            dateColumns={chartInput.dateColumns}
            vizConfig={chartInput.vizConfig}
          />
        </Box>
        <DataExplorerDrawer
          columns={queryResultColumns}
          data={queryResultData}
          splitColumnName={chartInput.splitColumnName}
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
    </AppSlate>
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
