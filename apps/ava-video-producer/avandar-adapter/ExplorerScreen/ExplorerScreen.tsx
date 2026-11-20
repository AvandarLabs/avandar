import { Select } from "@avandar/ui";
import { propEq } from "@avandar/utils";
import { Box, Stack } from "@mantine/core";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { useMemo } from "react";
import { BarChart } from "@/lib/ui/viz/BarChart/BarChart";
import { DataGrid } from "@/lib/ui/viz/DataGrid";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { AggregationFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/AggregationFields";
import { LimitFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/LimitFields/LimitFields";
import { SortFields } from "@/views/DataExplorerApp/QueryForm/ManualQueryForm/SortFields";
import { QueryFiltersField } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/QueryFiltersField";
import { DUR, caretOn, enter } from "../../src/motion";
import {
  EXPLORER_CASES,
  EXPLORER_CASES_DATASET_ID,
  EXPLORER_CASES_DATASET_NAME,
  EXPLORER_COLUMNS,
  EXPLORER_DISPLAY_COLUMNS,
  EXPLORER_DISTRICT_COUNTS,
  EXPLORER_SELECTED_COLUMNS,
} from "../Explorer.constants";
import { ExplorerDrawer } from "./ExplorerDrawer/ExplorerDrawer";
import css from "./ExplorerScreen.module.css";
import { ExplorerSqlEditor } from "./ExplorerSqlEditor";
import { barConfig, emptyFilter, explorerStage } from "./explorerStage";
import { ExplorerToolbar } from "./ExplorerToolbar/ExplorerToolbar";
import { useExplorerVideoTargets } from "./useExplorerVideoTargets";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import type { ExplorerMode } from "./explorerStage";
import type { ReactNode } from "react";

export type { ExplorerMode };

ModuleRegistry.registerModules([AllCommunityModule]);
const _noop = () => {};

export type Props = {
  frame: number;
  width: number;
  height: number;
  mode?: ExplorerMode;
};

/**
 * Real product leaves, with fixture bindings and a frame-owned controller
 * replacing app/network state.
 */
export function ExplorerScreen({
  frame,
  width,
  height,
  mode = "full",
}: Props): ReactNode {
  const stage = explorerStage(frame, mode);
  const rootRef = useExplorerVideoTargets({ frame, mode, time: stage.time });
  const filters: StructuredQuery.FilterGroup = useMemo(() => {
    return stage.hasFilterRule
      ? {
          ...emptyFilter,
          rules: [
            {
              type: "rule",
              id: "demo-district-filter",
              columnId: EXPLORER_COLUMNS.find(
                propEq("baseColumn.name", stage.filterColumn),
              )!.id,
              columnDataType: "varchar",
              operator: "=",
              value: stage.filterText,
            },
          ],
        }
      : emptyFilter;
  }, [stage.hasFilterRule, stage.filterText, stage.filterColumn]);
  const appliedFilters = stage.filterCommitted ? filters : emptyFilter;
  const rows = stage.isAggregate
    ? EXPLORER_DISTRICT_COUNTS
    : stage.filterCommitted
      ? EXPLORER_CASES.filter((row) => {
          return row.district_name === "Eastbank";
        })
      : EXPLORER_CASES;
  const drawerHeight = Math.min(330, Math.round(height * 0.46));
  const context = useMemo(() => {
    return {
      opened: stage.drawerProgress > 0,
      height: drawerHeight,
      maxHeight: drawerHeight,
      onResizePointerDown: _noop,
      onResizeKeyDown: _noop,
    };
  }, [stage.drawerProgress, drawerHeight]);

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
    <ExplorerSqlEditor sql={stage.sql} isEditingSql={stage.isEditingSql} />
  );

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
      <ExplorerToolbar />
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
      <ExplorerDrawer
        {...{ stage, drawerHeight, context, manualGroups, sqlEditor }}
      />
    </div>
  );
}
