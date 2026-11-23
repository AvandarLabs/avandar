import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AppliedFilterSummary } from "@/views/DataExplorerApp/AppliedFilterSummary/AppliedFilterSummary";
import { Motion } from "../../src/motion";
import { ExplorerDrawer } from "./ExplorerDrawer/ExplorerDrawer";
import { ExplorerResults } from "./ExplorerResults/ExplorerResults";
import css from "./ExplorerScreen.module.css";
import { ExplorerSqlEditor } from "./ExplorerSqlEditor/ExplorerSqlEditor";
import { ExplorerToolbar } from "./ExplorerToolbar/ExplorerToolbar";
import { getExplorerManualGroups } from "./getExplorerManualGroups";
import { useExplorerFrame } from "./useExplorerFrame";
import type { ExplorerMode } from "./ExplorerTimeline";
import type { CSSProperties, ReactNode } from "react";

export type { ExplorerMode };
ModuleRegistry.registerModules([AllCommunityModule]);
/** Frame, stage dimensions, and mode of the explorer reenactment. */
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
}: Readonly<Props>): ReactNode {
  const state = useExplorerFrame({ frame, mode, height });
  const { stage, rootRef, appliedFilters } = state;
  const manualGroups = getExplorerManualGroups(state);
  const sqlEditor = (
    <ExplorerSqlEditor sql={stage.sql} isEditingSql={stage.isEditingSql} />
  );
  return (
    <div
      ref={rootRef}
      className={css.explorerScreenRoot}
      style={
        {
          width,
          height,
          "--explorer-caret-opacity": Motion.caretOn(frame) ? 1 : 0,
        } as CSSProperties
      }
      data-video-stage={
        stage.isChart ? "chart" : stage.isSql ? "sql" : "filter"
      }
    >
      <ExplorerToolbar />
      {stage.filterCommitted ? (
        <div className={css.explorerScreenSummary}>
          <AppliedFilterSummary filters={appliedFilters} isStatusRegion />
        </div>
      ) : null}
      <ExplorerResults stage={stage} rows={state.rows} />
      <ExplorerDrawer
        stage={stage}
        drawerHeight={state.drawerHeight}
        context={state.context}
        {...{ manualGroups, sqlEditor }}
      />
    </div>
  );
}
