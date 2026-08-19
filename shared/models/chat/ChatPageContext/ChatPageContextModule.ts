import { Model } from "@avandar/models";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";

export const ChatPageContextModule = {
  /**
   * Builds the chat context for the Data Explorer app. The optional fields are
   * only included when present so the backend sees a minimal, accurate snapshot
   * of what the user is looking at.
   *
   * @param options.openDatasetId - Id of the dataset currently open, if any.
   * @param options.lastSql - The most recently generated SQL, if any.
   * @param options.lastResultColumns - Columns of the most recent result, if
   *   any. Sent so the model can reason about the current result schema.
   * @param options.lastError - Runtime error from the most recent SQL run, if
   *   any. Sent so the model can offer to fix the prior SQL.
   */
  createDataExplorerViewContext: (options?: {
    openDatasetId?: string;
    lastSql?: string;
    lastResultColumns?: readonly ChatPageContext.ResultColumn[];
    lastError?: string;
  }): ChatPageContext.T => {
    const { openDatasetId, lastSql, lastResultColumns, lastError } =
      options ?? {};
    const resultColumns =
      lastResultColumns && lastResultColumns.length > 0 ?
        lastResultColumns
      : undefined;
    return Model.make("ChatPageContext", {
      app: "data-explorer",
      ...(openDatasetId ? { openDatasetId } : {}),
      ...(lastSql ? { lastSql } : {}),
      ...(resultColumns ? { lastResultColumns: resultColumns } : {}),
      ...(lastError ? { lastError } : {}),
    });
  },

  /** Builds the chat context for the Data Sources app. */
  createDataSourcesViewContext: (): ChatPageContext.T => {
    return Model.make("ChatPageContext", { app: "data-sources" });
  },

  /**
   * Builds the chat context for the Dashboards app.
   *
   * @param options.dashboardId - Id of the dashboard currently being edited,
   *   if any. Lets the chat panel offer the `addDashboardBlock` tool and
   *   attach the dashboard id to analytics events.
   */
  createDashboardsViewContext: (options?: {
    dashboardId?: string;
  }): ChatPageContext.T => {
    const { dashboardId } = options ?? {};
    return Model.make("ChatPageContext", {
      app: "dashboards",
      ...(dashboardId ? { dashboardId } : {}),
    });
  },

  /** Builds the chat context for Case Manager (ontology designer). */
  createCaseManagerViewContext: (): ChatPageContext.T => {
    return Model.make("ChatPageContext", { app: "case-manager" });
  },

  /** Builds the chat context for any surface without dedicated tools. */
  createOtherViewContext: (): ChatPageContext.T => {
    return Model.make("ChatPageContext", { app: "other" });
  },
};
