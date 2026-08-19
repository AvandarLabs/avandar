import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";

type ModelType = "ChatPageContext";

/** Avandar surface the user is on when sending a chat message. */
export type ChatApp =
  | "data-explorer"
  | "data-sources"
  | "dashboards"
  | "case-manager"
  | "other";

export type ChatPageContextId = UUID<ModelType>;

/** A single column in the result the user is currently looking at. */
export type ChatPageContextResultColumn = {
  name: string;
  /** DuckDB type id, e.g. "bigint", "double", "varchar". */
  dataType: string;
};

export type ChatPageContextRead = Model.Base<
  ModelType,
  {
    app: ChatApp;
    openDatasetId?: string;
    /**
     * The SQL that's currently driving the canvas, whether the assistant
     * generated it, the user typed it, or it came from a manual form edit.
     * Always reflects the live document, not just the last assistant
     * generation.
     */
    lastSql?: string;
    /**
     * The columns of the result the user is currently looking at. Sent
     * alongside `lastSql` so the model can reason about the current result
     * schema (which may differ from the dataset schema when the SQL contains
     * `SELECT`-list projections, aggregations, or `AS` aliases).
     */
    lastResultColumns?: readonly ChatPageContextResultColumn[];
    /**
     * Runtime error message from the most recent SQL execution, if any. Sent
     * so the model can offer to fix the prior SQL when the user asks to
     * regenerate.
     */
    lastError?: string;
    /**
     * Set when the user is currently editing a dashboard. Only present when
     * `app === "dashboards"`.
     */
    dashboardId?: string;
  }
>;

export type ChatPageContextModel = {
  Read: ChatPageContextRead;
};
