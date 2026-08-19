import { Tabs } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import css from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.module.css";
import { DataExplorerDrawerRail } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail";
import { QueryTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";
import { useDrawerDisclosure } from "@/views/DataExplorerApp/DataExplorerDrawer/useDrawerDisclosure";
import { VizTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { ReactNode, RefObject } from "react";

/** The drawer's two sections. */
export type DrawerTab = "query" | "visualizations";

const DRAWER_TAB_IDS = ["query", "visualizations"] as const;

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

  return (
    <CanvasDrawer opened={!isCollapsed} canvasRef={chartRef} keepChrome>
      <CanvasDrawer.ResizeHandle />
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
          // The onboarding tutorial spotlights this label, so the anchor
          // goes on the label itself rather than on a wrapper around the
          // whole `Tabs`. A wrapper's bounding box is the entire drawer
          // whenever it is expanded, which is exactly when the tutorial
          // reaches this step, so the spotlight would cover everything
          // instead of the one control the tooltip is talking about.
          visualizations: (
            <span {...NuxAnchors.props(NuxAnchors.ids.explorerVizTab)}>
              {t`Visualizations`}
            </span>
          ),
        }}
        wrapPanels={(panels) => {
          return (
            <CanvasDrawer.Body regionId={DRAWER_REGION_ID}>
              {hasOpened ? panels : null}
            </CanvasDrawer.Body>
          );
        }}
        renderTabPanel={{
          query: () => {
            return <QueryTabPanel mode={queryEditorMode} />;
          },
          visualizations: () => {
            return (
              <div {...NuxAnchors.props(NuxAnchors.ids.explorerVizPanel)}>
                <VizTabPanel
                  columns={columns}
                  data={data}
                  vizConfig={vizConfig}
                  onVizConfigChange={dispatch.setVizConfig}
                />
              </div>
            );
          },
        }}
      />
    </CanvasDrawer>
  );
}
