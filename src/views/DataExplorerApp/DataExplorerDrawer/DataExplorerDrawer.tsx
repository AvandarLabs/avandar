import { Tooltip } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  ActionIcon,
  Badge,
  Box,
  Collapse,
  Group,
  SegmentedControl,
  Tabs,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useState } from "react";
import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect";
import css from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.module.css";
import { DRAWER_MIN_HEIGHT } from "@/views/DataExplorerApp/DataExplorerDrawer/drawerHeight/drawerHeight";
import { QueryTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel/QueryTabPanel";
import { useDrawerResize } from "@/views/DataExplorerApp/DataExplorerDrawer/useDrawerResize/useDrawerResize";
import { VizTabPanel } from "@/views/DataExplorerApp/DataExplorerDrawer/VizTabPanel/VizTabPanel";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { QueryEditorMode } from "@/views/DataExplorerApp/DataExplorerDrawer/QueryTabPanel/QueryTabPanel";
import type { UnknownDataFrame } from "@avandar/utils";
import type { QueryResultColumn } from "$/models/queries/QueryResult/QueryResult.types";
import type { CSSProperties, ReactNode, RefObject } from "react";

/** The drawer's two sections. */
type DrawerTab = "query" | "visualizations";

type Props = {
  /** Columns of the current query result, used by the chart settings. */
  columns: readonly QueryResultColumn[];

  /** Rows of the current query result, used by per-slice color controls. */
  data: UnknownDataFrame;

  /**
   * The canvas the drawer is docked to. Its height caps how tall the drawer
   * may be dragged.
   */
  canvasRef: RefObject<HTMLElement | null>;
};

/**
 * Collapsible drawer docked to the bottom of the Data Explorer canvas,
 * holding the query editor and the chart settings as two tabs.
 *
 * The tab rail stays visible while collapsed, so selecting a tab also
 * expands the drawer. None of the drawer's state (active tab, collapsed,
 * height) is persisted: it resets with the view.
 */
export function DataExplorerDrawer({
  columns,
  data,
  canvasRef,
}: Props): ReactNode {
  const { t } = useLingui();
  const [{ vizConfig, isStructuredQueryInSync }, dispatch] =
    DataExplorerStateManager.useContext();
  const [activeTab, setActiveTab] = useState<DrawerTab>("query");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [queryEditorMode, setQueryEditorMode] =
    useState<QueryEditorMode>("manual");

  const { height, maxHeight, onResizePointerDown, onResizeKeyDown } =
    useDrawerResize({ canvasRef });

  const onTabChange = (nextTab: string | null): void => {
    if (nextTab !== "query" && nextTab !== "visualizations") {
      return;
    }
    setActiveTab(nextTab);
    setIsCollapsed(false);
  };

  const bodyStyle: CSSProperties = { height };

  return (
    <Tabs
      value={activeTab}
      onChange={onTabChange}
      variant="none"
      className={css.root}
      keepMounted={false}
    >
      {isCollapsed ? null : (
        <div
          className={css.resizeHandle}
          role="separator"
          aria-orientation="horizontal"
          aria-label={t`Resize drawer`}
          aria-valuenow={height}
          aria-valuemin={DRAWER_MIN_HEIGHT}
          aria-valuemax={maxHeight}
          tabIndex={0}
          onPointerDown={onResizePointerDown}
          onKeyDown={onResizeKeyDown}
        />
      )}

      <Group
        className={css.rail}
        px="xs"
        gap="sm"
        justify="space-between"
        wrap="nowrap"
      >
        <Tabs.List className={css.railTabs}>
          <Tabs.Tab value="query" className={css.railTab}>
            <Trans>Query</Trans>
          </Tabs.Tab>
          <Tabs.Tab value="visualizations" className={css.railTab}>
            <Trans>Visualizations</Trans>
          </Tabs.Tab>
        </Tabs.List>

        <Group className={css.railControls} gap="xs" wrap="nowrap">
          {activeTab === "query" && !isStructuredQueryInSync ?
            <Tooltip
              label={t`Parts of the SQL cannot be represented in the manual form.`}
            >
              <Badge
                color="warning"
                variant="light"
                size="sm"
                leftSection={<IconAlertTriangle size={11} />}
              >
                <Trans>Form is an approximation</Trans>
              </Badge>
            </Tooltip>
          : null}

          {activeTab === "query" ?
            <SegmentedControl
              size="xs"
              aria-label={t`Query editor mode`}
              value={queryEditorMode}
              onChange={(nextMode) => {
                setQueryEditorMode(nextMode as QueryEditorMode);
              }}
              data={[
                { value: "manual", label: t`Manual` },
                { value: "sql", label: "SQL" },
              ]}
            />
          : <VizTypeSelect
              size="xs"
              withLabel={false}
              value={vizConfig.vizType}
              onChange={dispatch.setActiveVizType}
            />
          }

          <Tooltip
            label={isCollapsed ? t`Expand` : t`Collapse`}
            openDelay={400}
          >
            <ActionIcon
              variant="subtle"
              color="neutral"
              size="md"
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? t`Expand drawer` : t`Collapse drawer`}
              onClick={() => {
                setIsCollapsed((wasCollapsed) => {
                  return !wasCollapsed;
                });
              }}
            >
              {isCollapsed ?
                <IconChevronUp size={16} />
              : <IconChevronDown size={16} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Collapse expanded={!isCollapsed} transitionDuration={240}>
        <Box className={css.body} style={bodyStyle}>
          <Tabs.Panel value="query">
            <QueryTabPanel mode={queryEditorMode} />
          </Tabs.Panel>
          <Tabs.Panel value="visualizations">
            <VizTabPanel
              columns={columns}
              data={data}
              vizConfig={vizConfig}
              onVizConfigChange={dispatch.setVizConfig}
            />
          </Tabs.Panel>
        </Box>
      </Collapse>
    </Tabs>
  );
}
