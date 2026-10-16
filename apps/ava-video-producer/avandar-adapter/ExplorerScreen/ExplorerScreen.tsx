import { Select, Tabs } from "@avandar/ui";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import {
  IconChevronDown,
  IconDownload,
  IconFolderOpen,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import drawerCss from "@/components/CanvasDrawer/CanvasDrawer.module.css";
import drawerBodyCss from "@/components/CanvasDrawer/CanvasDrawerBody/CanvasDrawerBody.module.css";
import { CanvasDrawerContext } from "@/components/CanvasDrawer/CanvasDrawerContext";
import { CanvasDrawerResizeHandle } from "@/components/CanvasDrawer/CanvasDrawerResizeHandle/CanvasDrawerResizeHandle";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { SqlEditor } from "@/components/sql/SqlEditor/SqlEditor";
import { SeriesAwareVizForm } from "@/components/VisualizationContainer/VizSettingsForm/SeriesAwareVizForm/SeriesAwareVizForm";
import { BarChart } from "@/lib/ui/viz/BarChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import railCss from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.module.css";
import { DataExplorerDrawerRail } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";
import { LimitFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/LimitFields/LimitFields";
import { SortFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SortFields";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import sqlCss from "@/views/DataExplorerApp/SqlQueryView/SqlQueryView.module.css";
import { DUR, caretOn, enter } from "../../src/motion";
import {
  EXPLORER_CASES,
  EXPLORER_CASES_DATASET_ID,
  EXPLORER_CASES_DATASET_NAME,
  EXPLORER_COLUMNS,
  EXPLORER_DISPLAY_COLUMNS,
  EXPLORER_DISTRICT_COUNTS,
  EXPLORER_SELECTED_COLUMNS,
  EXPLORER_SQL_CATALOG,
} from "../Explorer.constants";
import {
  aggregateColumns,
  barConfig,
  emptyFilter,
  explorerStage,
} from "./explorerStage";
import css from "./ExplorerScreen.module.css";
import type { ExplorerMode } from "./explorerStage";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { EditorView } from "@codemirror/view";

export type { ExplorerMode };
export { EXPLORER_BEATS, explorerBeats } from "./explorerStage";

ModuleRegistry.registerModules([AllCommunityModule]);
const _noop = () => {};

export type Props = {
  frame: number;
  width: number;
  height: number;
  mode?: ExplorerMode;
};

/** Real product leaves, with fixture bindings and a frame-owned controller replacing app/network state. */
export function ExplorerScreen({
  frame,
  width,
  height,
  mode = "full",
}: Props) {
  const stage = explorerStage(frame, mode);
  const rootRef = useRef<HTMLDivElement>(null);
  const sqlViewRef = useRef<EditorView | null>(null);
  const filters: StructuredQuery.FilterGroup = useMemo(
    () =>
      stage.hasFilterRule
        ? {
            ...emptyFilter,
            rules: [
              {
                type: "rule",
                id: "demo-district-filter",
                columnName: stage.filterColumn,
                columnDataType: "varchar",
                operator: "=",
                value: stage.filterText,
              },
            ],
          }
        : emptyFilter,
    [stage.hasFilterRule, stage.filterText, stage.filterColumn],
  );
  const appliedFilters = stage.filterCommitted ? filters : emptyFilter;
  const rows = stage.isAggregate
    ? EXPLORER_DISTRICT_COUNTS
    : stage.filterCommitted
      ? EXPLORER_CASES.filter((row) => row.district_name === "Eastbank")
      : EXPLORER_CASES;
  const drawerHeight = Math.min(330, Math.round(height * 0.46));
  const context = useMemo(
    () => ({
      opened: stage.drawerProgress > 0,
      height: drawerHeight,
      maxHeight: drawerHeight,
      onResizePointerDown: _noop,
      onResizeKeyDown: _noop,
    }),
    [stage.drawerProgress, drawerHeight],
  );

  // Attribute-only instrumentation preserves the product DOM and styles.
  // Targets come from the actual rendered leaves, never estimated CSS coordinates.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targets: Array<[string, string]> = [
      ['[data-testid="filter-value-scalar"]', "explorer-filter-value"],
      ['[aria-label="Visualization Type"]', "explorer-viz-type"],
      ['[aria-label="Column"]', "explorer-filter-column"],
      ['[aria-label="Condition"]', "explorer-filter-operator"],
    ];
    targets.forEach(([selector, target]) =>
      root.querySelector(selector)?.setAttribute("data-video-target", target),
    );
    root.querySelectorAll("button").forEach((button) => {
      if (button.textContent?.trim() === "+ Condition")
        button.setAttribute("data-video-target", "explorer-add-condition");
    });
    root.querySelectorAll("label").forEach((label) => {
      if (label.textContent?.trim() === "SQL")
        label.setAttribute("data-video-target", "explorer-sql-mode");
    });
    const filterInput = root.querySelector<HTMLInputElement>(
      '[data-testid="filter-value-scalar"]',
    );
    if (filterInput && stage.time >= 132 && stage.time < 190) {
      filterInput.focus();
      filterInput.setSelectionRange(
        filterInput.value.length,
        filterInput.value.length,
      );
    } else if (filterInput && document.activeElement === filterInput) {
      filterInput.blur();
    }
  }, [frame, mode, stage.time]);

  useEffect(() => {
    if (stage.isEditingSql && sqlViewRef.current) {
      const view = sqlViewRef.current;
      view.focus();
      view.dispatch({ selection: { anchor: view.state.doc.length } });
    }
  }, [stage.sql, stage.isEditingSql]);

  const query = {
    queryColumns: EXPLORER_SELECTED_COLUMNS,
    aggregations: {},
    filters,
    having: emptyFilter,
    joins: [],
    limit: undefined,
  } as unknown as StructuredQuery.Partial;
  const manualGroups = [
    {
      id: "source",
      title: "Source",
      content: (
        <>
          <div data-video-target="explorer-source">
            <Select
              label="Data source"
              placeholder="Select a data source"
              value={EXPLORER_CASES_DATASET_ID}
              data={[
                {
                  value: EXPLORER_CASES_DATASET_ID,
                  label: EXPLORER_CASES_DATASET_NAME,
                },
              ]}
              onChange={_noop}
            />
          </div>
          <QueryColumnMultiSelect
            label="Select columns"
            placeholder="Select columns to query"
            value={EXPLORER_SELECTED_COLUMNS}
            onChange={_noop}
            comboboxProps={{ withinPortal: false }}
          />
        </>
      ),
    },
    {
      id: "aggregations",
      title: "Aggregations",
      content: (
        <AggregationFields
          queryColumns={EXPLORER_SELECTED_COLUMNS}
          aggregations={{}}
          onSetColumnAggregation={_noop}
          withinPortal={false}
        />
      ),
    },
    {
      id: "filters",
      title: "Filters (Where)",
      span: 2,
      content: (
        <Stack gap="xs">
          <AppliedFilterSummary filters={appliedFilters} />
          <QueryFiltersField
            columns={EXPLORER_COLUMNS}
            value={filters}
            onChange={_noop}
          />
        </Stack>
      ),
    },
    {
      id: "sort-limit",
      title: "Sort & limit",
      content: (
        <>
          <SortFields
            queryColumns={EXPLORER_SELECTED_COLUMNS}
            orderByColumn={undefined}
            orderByDirection={undefined}
            onSetOrderByColumn={_noop}
            onSetOrderByDirection={_noop}
            withinPortal={false}
          />
          <LimitFields
            query={query}
            onSetLimit={_noop}
            isLargeDatasetLimitHintVisible={false}
            dismissLargeDatasetLimitHint={_noop}
          />
        </>
      ),
    },
  ];

  const sqlEditor = (
    <div className={css.explorerSqlGroup}>
      <Stack gap={stage.isEditingSql ? "sm" : "xs"}>
        {stage.isEditingSql ? (
          <div data-video-target="explorer-sql-editor">
            <SqlEditor
              value={stage.sql}
              catalog={EXPLORER_SQL_CATALOG}
              onChange={_noop}
              minRows={9}
              onEditorReady={(view) => {
                sqlViewRef.current = view;
              }}
            />
          </div>
        ) : (
          <Paper p="sm" className={sqlCss.sqlPaper}>
            <SqlEditor
              value={stage.sql}
              catalog={EXPLORER_SQL_CATALOG}
              onChange={_noop}
              readOnly
              minRows={9}
            />
          </Paper>
        )}
        <Group
          justify="flex-end"
          gap="xs"
          className={stage.isEditingSql ? undefined : sqlCss.editQueryRow}
        >
          {stage.isEditingSql ? (
            <>
              <Button
                data-video-target="explorer-run-query"
                size="sm"
                variant="default"
                disabled={stage.sql.trim().length === 0}
                onClick={_noop}
              >
                Re-run query
              </Button>
              <Button size="sm" variant="subtle" onClick={_noop}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              data-video-target="explorer-edit-query"
              size="xs"
              variant="subtle"
              onClick={_noop}
            >
              Edit query
            </Button>
          )}
        </Group>
      </Stack>
    </div>
  );

  // The drawer, toolbar and canvas below remain inline rather than further split:
  // they share `stage`, `filters`, `manualGroups`, and `sqlEditor` from this closure
  // in ways that would otherwise require threading most of this function's state
  // through prop lists, without reducing the file's real complexity.
  return (
    <div
      ref={rootRef}
      className={css.explorerRoot}
      style={
        {
          width,
          height,
          "--explorer-caret-opacity": caretOn(frame) ? 1 : 0,
        } as React.CSSProperties
      }
      data-video-stage={
        stage.isChart ? "chart" : stage.isSql ? "sql" : "filter"
      }
    >
      <Group
        bg="white"
        py="xs"
        w="100%"
        justify="flex-end"
        px="md"
        pos="relative"
        className={css.explorerToolbar}
      >
        <Text size="xs" c="neutral.6" className={css.explorerFictional}>
          Fictional demonstration data
        </Text>
        <Button
          variant="subtle"
          color="neutral"
          leftSection={<IconRotateClockwise size={16} />}
          size="compact-sm"
          onClick={_noop}
        >
          Reset
        </Button>
        <Button
          variant="outline"
          color="neutral"
          leftSection={<IconFolderOpen size={16} />}
          size="compact-sm"
          onClick={_noop}
        >
          Open
        </Button>
        <Button
          variant="outline"
          color="neutral"
          rightSection={<IconChevronDown size={16} />}
          size="compact-sm"
          onClick={_noop}
        >
          Save
        </Button>
        <Button
          variant="outline"
          color="neutral"
          leftSection={<IconDownload size={16} />}
          size="compact-sm"
          onClick={_noop}
        >
          Export
        </Button>
      </Group>
      {stage.filterCommitted ? (
        <div className={css.explorerSummary}>
          <AppliedFilterSummary filters={appliedFilters} isStatusRegion />
        </div>
      ) : null}
      <div className={css.explorerCanvas} data-video-target="explorer-results">
        {stage.isChart ? (
          <Box
            h="100%"
            w="100%"
            style={enter(stage.time, 650, { y: 8, dur: DUR.hero })}
          >
            <BarChart
              data={EXPLORER_DISTRICT_COUNTS}
              xAxisKey="district_name"
              series={barConfig.series}
              height="100%"
              withLegend
              layout="group"
            />
          </Box>
        ) : (
          <DataGrid
            columnNames={
              stage.isAggregate
                ? ["district_name", "recorded_cases"]
                : EXPLORER_DISPLAY_COLUMNS
            }
            data={rows}
            height="100%"
            onGridReady={(event) => {
              event.api.setGridOption("animateRows", false);
            }}
          />
        )}
      </div>
      <CanvasDrawerContext.Provider value={context}>
        <div className={drawerCss.canvasDrawerRoot} data-chrome="true">
          <CanvasDrawerResizeHandle />
          <Tabs
            size="sm"
            keepMounted={false}
            tabIds={["query", "visualizations"]}
            value={stage.isVisualizations ? "visualizations" : "query"}
            onTabChange={_noop}
            withActiveIndicator={stage.drawerProgress > 0}
            classNames={{ list: railCss.drawerRail }}
            listRightSection={
              <DataExplorerDrawerRail
                activeTab={stage.isVisualizations ? "visualizations" : "query"}
                isCollapsed={stage.drawerProgress === 0}
                regionId="demo-explorer-drawer"
                queryEditorMode={stage.isSql ? "sql" : "manual"}
                vizType={stage.isChart ? "bar" : "table"}
                isStructuredQueryInSync
                onQueryEditorModeChange={_noop}
                onVizTypeChange={_noop}
                onToggleCollapsed={_noop}
              />
            }
            renderTabHeader={{
              query: <span data-video-target="explorer-query-tab">Query</span>,
              visualizations: (
                <span data-video-target="explorer-viz-tab">Visualizations</span>
              ),
            }}
            wrapPanels={(panels) => (
              <div
                id="demo-explorer-drawer"
                className={css.explorerDrawerBody}
                style={{ height: drawerHeight * stage.drawerProgress }}
              >
                <Box
                  className={drawerBodyCss.canvasDrawerBody}
                  style={{ height: drawerHeight }}
                >
                  {stage.drawerProgress > 0 ? panels : null}
                </Box>
              </div>
            )}
            renderTabPanel={{
              query: () =>
                stage.isSql ? (
                  <SettingsColumns
                    layout="columns"
                    minColumnWidth={320}
                    groups={[{ id: "sql", title: "SQL", content: sqlEditor }]}
                  />
                ) : (
                  <SettingsColumns groups={manualGroups} layout="columns" />
                ),
              visualizations: () =>
                stage.isChart ? (
                  <SeriesAwareVizForm
                    fields={aggregateColumns}
                    config={barConfig}
                    onConfigChange={_noop}
                    layout="columns"
                  />
                ) : (
                  <Stack gap={4} p="sm">
                    <Text size="sm" fw={600} c="neutral.7">
                      Table view has no chart settings.
                    </Text>
                    <Text size="xs" c="neutral.6">
                      Pick a chart type above to configure one.
                    </Text>
                  </Stack>
                ),
            }}
          />
        </div>
      </CanvasDrawerContext.Provider>
    </div>
  );
}
