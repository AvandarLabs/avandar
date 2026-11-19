import type { ChatGeneratedDashboardBlock } from "$/types/chat.types";
import type { EvalQuestion } from "../../EvalQuestion";

/** Today's chat page context for the Data Explorer. */
export type ExplorerContext = {
  app: "data-explorer";
  openDatasetId?: string;
  lastSql?: string;
  lastResultColumns?: Array<{ name: string; dataType: string }>;
  lastError?: string;
};

/** The page contexts today's chat reads, as the baseline sends them. */
export type BaselinePageContext =
  | ExplorerContext
  | { app: "dashboards"; dashboardId?: string }
  | { app: "other" };

/** What today's app does with a dashboard block on the current page. */
export type BaselineBlockOutcome =
  | { kind: "editor_write"; dashboardId: string }
  | { kind: "explorer_chart" }
  | { kind: "dashboard_only" }
  | { kind: "dropped" };

function _toExplorerContext(
  pageContext: NonNullable<EvalQuestion["pageContext"]>,
): ExplorerContext {
  const { dataset, explorer } = pageContext;
  return {
    app: "data-explorer",
    ...(dataset ? { openDatasetId: dataset.id } : {}),
    ...(explorer?.sql ? { lastSql: explorer.sql } : {}),
    ...(explorer?.resultColumns.length
      ? {
          lastResultColumns: explorer.resultColumns.map((column) => {
            return { ...column };
          }),
        }
      : {}),
  };
}

/**
 * Today's chat page context for a question's screen. The Data Explorer
 * sends its dataset and query. A dashboard question elsewhere sends the
 * dashboards app with the open editor's id, or `other`, as the app does.
 * Other questions on other screens return undefined and keep the context
 * the conversation built, so archived page runs stay comparable: today's
 * chat sees no tiles, maps, or case types.
 */
export function toBaselinePageContext(
  question: EvalQuestion,
): BaselinePageContext | undefined {
  const { pageContext } = question;
  if (pageContext?.app === "data-explorer") {
    return _toExplorerContext(pageContext);
  }
  if (question.category !== "dashboards") {
    return undefined;
  }
  if (question.openEditorDashboardId) {
    return { app: "dashboards", dashboardId: question.openEditorDashboardId };
  }
  return pageContext?.app === "dashboard" || pageContext?.app === "dashboards"
    ? { app: "dashboards" }
    : { app: "other" };
}

/**
 * What today's app does with a dashboard block: adds it to the open
 * editor (`shouldQueueDashboardBlock`), runs a chart in the Data Explorer
 * (`dashboardBlockToExplorerResponse`), answers a text block there with the
 * dashboard-only reply, and drops it on any page without an open editor.
 */
export function getBaselineBlockOutcome(
  context: BaselinePageContext,
  block: ChatGeneratedDashboardBlock,
): BaselineBlockOutcome {
  if (context.app === "dashboards" && context.dashboardId) {
    return { kind: "editor_write", dashboardId: context.dashboardId };
  }
  if (context.app === "data-explorer") {
    return block.kind === "DataViz"
      ? { kind: "explorer_chart" }
      : { kind: "dashboard_only" };
  }
  return { kind: "dropped" };
}
