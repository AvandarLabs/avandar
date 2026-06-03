import { Model } from "@models/Model/Model.ts";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext.ts";

export const ChatPageContextModule = {
  /**
   * Builds the chat context for the Data Explorer app. The optional fields are
   * only included when present so the backend sees a minimal, accurate snapshot
   * of what the user is looking at.
   *
   * @param options.openDatasetId - Id of the dataset currently open, if any.
   * @param options.lastSql - The most recently generated SQL, if any.
   * @param options.lastError - Runtime error from the most recent SQL run, if
   *   any. Sent so the model can offer to fix the prior SQL.
   */
  createDataExplorerViewContext: (options?: {
    openDatasetId?: string;
    lastSql?: string;
    lastError?: string;
  }): ChatPageContext.T => {
    const { openDatasetId, lastSql, lastError } = options ?? {};
    return Model.make("ChatPageContext", {
      app: "data-explorer",
      ...(openDatasetId ? { openDatasetId } : {}),
      ...(lastSql ? { lastSql } : {}),
      ...(lastError ? { lastError } : {}),
    });
  },

  /** Builds the chat context for the Data Sources app. */
  createDataSourcesViewContext: (): ChatPageContext.T => {
    return Model.make("ChatPageContext", { app: "data-sources" });
  },

  /** Builds the chat context for the Dashboards app. */
  createDashboardsViewContext: (): ChatPageContext.T => {
    return Model.make("ChatPageContext", { app: "dashboards" });
  },

  /** Builds the chat context for any surface without dedicated tools. */
  createOtherViewContext: (): ChatPageContext.T => {
    return Model.make("ChatPageContext", { app: "other" });
  },
};
