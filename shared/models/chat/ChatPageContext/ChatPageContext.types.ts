import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";

type ModelType = "ChatPageContext";

/** Avandar surface the user is on when sending a chat message. */
export type ChatApp = "data-explorer" | "data-sources" | "dashboards" | "other";

export type ChatPageContextId = UUID<ModelType>;

export type ChatPageContextRead = Model.Base<
  ModelType,
  {
    app: ChatApp;
    openDatasetId?: string;
    lastSql?: string;
    /**
     * Runtime error message from the most recent SQL execution, if any. Sent
     * so the model can offer to fix the prior SQL when the user asks to
     * regenerate.
     */
    lastError?: string;
  }
>;

export type ChatPageContextModel = {
  Read: ChatPageContextRead;
};
