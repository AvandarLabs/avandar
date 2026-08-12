import { Tabs } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Box, Collapse } from "@mantine/core";
import { useState } from "react";
import css from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.module.css";
import { DataExplorerDrawerRail } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail";
import { DrawerHeight } from "@/views/DataExplorerApp/DataExplorerDrawer/DrawerHeight/DrawerHeight";
import { QueryTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";
import { useDrawerDisclosure } from "@/views/DataExplorerApp/DataExplorerDrawer/useDrawerDisclosure";
import { useDrawerResize } from "@/views/DataExplorerApp/DataExplorerDrawer/useDrawerResize";
import { VizTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { ReactNode, RefObject } from "react";

/** The drawer's two sections. */
export type DrawerTab = "query" | "visualizations";

const DRAWER_TAB_IDS = ["query", "visualizations"] as const;

/** Duration of the collapse and expand animation, in milliseconds. */
const COLLAPSE_DURATION_MS = 240;

/** Ties the chevron's `aria-expanded` to the region it reveals. */
const DRAWER_REGION_ID = "data-explorer-drawer-region";

type Props = {
  /** Columns of the current query result, used by the chart settings. */
  columns: readonly QueryResult.Column[];

  /** Rows of the current query result, used by per-slice color controls. */
  data: UnknownDataFrame;

  /**
   * The chart area the drawer is docked beneath. Its height plus the drawer's
   * own is the region the two share, which is what caps the drag.
   */
  chartRef: RefObject<HTMLElement | null>;
};

/**
 * Collapsible drawer docked to the bottom of the Data Explorer canvas, holding
 * the query editor and the chart settings as two tabs.
 *
 * Opens shut, so the chart has the whole canvas until the user asks for the
 * controls. The tab labels stay visible while shut and are a second way in
 * alongside the chevron; `useDrawerDisclosure` owns which one lands on which
 * tab.
 */
export function DataExplorerDrawer({
  columns,
  data,
  chartRef,
}: Props): ReactNode {
  const { t } = useLingui();
  const [{ vizConfig, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();
  const { activeTab, isCollapsed, hasOpened, onTabChange, onToggleCollapsed } =
    useDrawerDisclosure();
  const [queryEditorMode, setQueryEditorMode] =
    useState<QueryEditorMode>("manual");

  const { height, maxHeight, onResizePointerDown, onResizeKeyDown } =
    useDrawerResize({ chartRef });

  return (
    <div className={css.root}>
      {isCollapsed ? null : (
        <div
          className={css.resizeHandle}
          role="separator"
          aria-orientation="horizontal"
          aria-label={t`Resize drawer`}
          aria-valuenow={height}
          aria-valuemin={DrawerHeight.MIN_HEIGHT}
          aria-valuemax={maxHeight}
          tabIndex={0}
          onPointerDown={onResizePointerDown}
          onKeyDown={onResizeKeyDown}
        />
      )}

      <Tabs
        size="sm"
        keepMounted={false}
        tabIds={DRAWER_TAB_IDS}
        value={activeTab}
        onTabChange={onTabChange}
        withActiveIndicator={!isCollapsed}
        classNames={{ list: css.drawerRail }}
        listRightSection={
          <DataExplorerDrawerRail
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            regionId={DRAWER_REGION_ID}
            queryEditorMode={queryEditorMode}
            vizType={vizConfig.vizType}
            isStructuredQueryInSync={isStructuredQueryInSync}
            onQueryEditorModeChange={setQueryEditorMode}
            onVizTypeChange={dispatch.setActiveVizType}
            onToggleCollapsed={onToggleCollapsed}
          />
        }
        renderTabHeader={{
          query: t`Query`,
          visualizations: t`Visualizations`,
        }}
        wrapPanels={(panels) => {
          return (
            // One long-lived `Collapse` around every panel is what makes the
            // chevron and a tab label animate alike; a per-panel one would
            // remount on the tab change and skip its transition. The panels
            // themselves are still swapped per tab, since `keepMounted` is off.
            //
            // Under `prefers-reduced-motion` Mantine drops the transition and
            // renders the children only while expanded, so those users get a
            // remount on each open instead. There is no animation to preserve
            // for them, and the editors' queries are already cached.
            <Collapse
              id={DRAWER_REGION_ID}
              expanded={!isCollapsed}
              transitionDuration={COLLAPSE_DURATION_MS}
            >
              <Box className={css.drawerBody} style={{ height }}>
                {/* Deferring the first mount keeps a shut drawer from running
                    the editors' data fetching at all. */}
                {hasOpened ? panels : null}
              </Box>
            </Collapse>
          );
        }}
        renderTabPanel={{
          query: () => {
            return <QueryTabPanel mode={queryEditorMode} />;
          },
          visualizations: () => {
            return (
              <VizTabPanel
                columns={columns}
                data={data}
                vizConfig={vizConfig}
                onVizConfigChange={dispatch.setVizConfig}
              />
            );
          },
        }}
      />
    </div>
  );
}
