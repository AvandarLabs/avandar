import { DataExplorerDrawerRail } from "@/views/DataExplorerApp/DataExplorerDrawer/DataExplorerDrawerRail/DataExplorerDrawerRail";
import { aggregateColumns, barConfig } from "../ExplorerTimeline";
import type { ExplorerDrawerProps } from "./ExplorerDrawer.types";
import type { ReactNode } from "react";

type Props = Pick<ExplorerDrawerProps, "stage">;

const _noop = () => {};

/** Native rail controls reflect the frame's query and visualization modes. */
export function ExplorerDrawerRail({ stage }: Readonly<Props>): ReactNode {
  return (
    <DataExplorerDrawerRail
      activeTab={stage.isVisualizations ? "visualizations" : "query"}
      isCollapsed={stage.drawerProgress === 0}
      regionId="demo-explorer-drawer"
      queryEditorMode={stage.isSql ? "sql" : "manual"}
      vizConfig={stage.isChart ? barConfig : { vizType: "table" }}
      columns={aggregateColumns}
      isStructuredQueryInSync
      onQueryEditorModeChange={_noop}
      onVizTypeChange={_noop}
      onToggleCollapsed={_noop}
    />
  );
}
