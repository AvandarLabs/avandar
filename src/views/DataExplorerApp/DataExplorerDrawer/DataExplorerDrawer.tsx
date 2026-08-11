import { Tabs } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Box, Collapse } from "@mantine/core";
import { useState } from "react";
import css from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.module.css";
import { DataExplorerDrawerRail } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail";
import { DrawerHeight } from "@/views/DataExplorerApp/DataExplorerDrawer/DrawerHeight/DrawerHeight";
import { QueryTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel/QueryTabPanel";
import { useDrawerResize } from "@/views/DataExplorerApp/DataExplorerDrawer/useDrawerResize/useDrawerResize";
import { VizTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel/QueryTabPanel";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { ReactNode, RefObject } from "react";

/** The drawer's two sections. */
export type DrawerTab = "query" | "visualizations";

const DRAWER_TAB_IDS = ["query", "visualizations"] as const;

/** Duration of the collapse and expand animation, in milliseconds. */
const COLLAPSE_DURATION_MS = 240;

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
 * The tab rail stays visible while collapsed, so selecting a tab also expands
 * the drawer. None of the drawer's state (active tab, collapsed, height) is
 * persisted: it resets with the view.
 */
export function DataExplorerDrawer({
  columns,
  data,
  chartRef,
}: Props): ReactNode {
  const { t } = useLingui();
  const [{ vizConfig, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();
  const [activeTab, setActiveTab] = useState<DrawerTab>("query");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [queryEditorMode, setQueryEditorMode] =
    useState<QueryEditorMode>("manual");

  const { height, maxHeight, onResizePointerDown, onResizeKeyDown } =
    useDrawerResize({ chartRef });

  const onTabChange = (nextTab: DrawerTab): void => {
    setActiveTab(nextTab);
    setIsCollapsed(false);
  };

  /**
   * Wraps a tab's content in the collapsible, resizable body. Only the active
   * tab's panel is mounted, so one wrapper per panel still yields a single live
   * `Collapse`, whose animation is driven by the chevron rather than by tab
   * changes.
   */
  const renderDrawerBody = (content: ReactNode): ReactNode => {
    return (
      <Collapse
        expanded={!isCollapsed}
        transitionDuration={COLLAPSE_DURATION_MS}
      >
        <Box className={css.drawerBody} style={{ height }}>
          {content}
        </Box>
      </Collapse>
    );
  };

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
        keepMounted={false}
        tabIds={DRAWER_TAB_IDS}
        value={activeTab}
        onTabChange={onTabChange}
        classNames={{ list: css.drawerRail }}
        listRightSection={
          <DataExplorerDrawerRail
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            queryEditorMode={queryEditorMode}
            vizType={vizConfig.vizType}
            isStructuredQueryInSync={isStructuredQueryInSync}
            onQueryEditorModeChange={setQueryEditorMode}
            onVizTypeChange={dispatch.setActiveVizType}
            onToggleCollapsed={() => {
              setIsCollapsed((wasCollapsed) => {
                return !wasCollapsed;
              });
            }}
          />
        }
        renderTabHeader={{
          query: t`Query`,
          visualizations: t`Visualizations`,
        }}
        renderTabPanel={{
          query: () => {
            return renderDrawerBody(<QueryTabPanel mode={queryEditorMode} />);
          },
          visualizations: () => {
            return renderDrawerBody(
              <VizTabPanel
                columns={columns}
                data={data}
                vizConfig={vizConfig}
                onVizConfigChange={dispatch.setVizConfig}
              />,
            );
          },
        }}
      />
    </div>
  );
}
