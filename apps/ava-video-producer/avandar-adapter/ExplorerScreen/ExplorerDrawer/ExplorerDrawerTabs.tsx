import { Tabs } from "@avandar/ui";
import railCss from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawer.module.css";
import { ExplorerDrawerPanels } from "./ExplorerDrawerPanels/ExplorerDrawerPanels";
import { ExplorerDrawerRail } from "./ExplorerDrawerRail";
import { ExplorerQuerySettings } from "./ExplorerQuerySettings";
import { ExplorerVisualizationSettings } from "./ExplorerVisualizationSettings";
import type { ExplorerDrawerProps } from "./ExplorerDrawer.types";
import type { ReactNode } from "react";

type Props = Omit<ExplorerDrawerProps, "context">;

const _noop = () => {};

/**
 * Query and visualization tabs retain the native mount and collapse behavior.
 */
export function ExplorerDrawerTabs({
  stage,
  drawerHeight,
  manualGroups,
  sqlEditor,
}: Readonly<Props>): ReactNode {
  return (
    <Tabs
      size="sm"
      keepMounted={false}
      tabIds={["query", "visualizations"]}
      value={stage.isVisualizations ? "visualizations" : "query"}
      onTabChange={_noop}
      withActiveIndicator={stage.drawerProgress > 0}
      classNames={{ list: railCss.drawerRail }}
      listRightSection={<ExplorerDrawerRail stage={stage} />}
      renderTabHeader={{
        query: <span data-video-target="explorer-query-tab">Query</span>,
        visualizations: (
          <span data-video-target="explorer-viz-tab">Visualizations</span>
        ),
      }}
      wrapPanels={(panels) => {
        return (
          <ExplorerDrawerPanels stage={stage} drawerHeight={drawerHeight}>
            {panels}
          </ExplorerDrawerPanels>
        );
      }}
      renderTabPanel={{
        query: () => {
          return (
            <ExplorerQuerySettings {...{ stage, manualGroups, sqlEditor }} />
          );
        },
        visualizations: () => {
          return <ExplorerVisualizationSettings stage={stage} />;
        },
      }}
    />
  );
}
