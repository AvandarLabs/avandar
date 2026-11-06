import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type ActivityEventId = UUID<"ActivityEvent">;
export type ActivityEventKind = Enums<"activity_events__kind">;
export type ActivityEventSource = Enums<"activity_events__source">;

/**
 * Kind-specific detail. Keys are stored as written by the database triggers.
 */
export type ActivityEventPayload = Readonly<Record<string, unknown>>;

type ActivityEventRead = {
  /**
   * Undefined for system and external events, or once the account is
   * deleted.
   */
  actorUserId: User.Id | undefined;
  commentId: Comment.Id | undefined;
  id: ActivityEventId;
  individualId: Individual.Id;
  kind: ActivityEventKind;
  occurredAt: string;
  payload: ActivityEventPayload;
  payloadVersion: number;
  recordedAt: string;
  source: ActivityEventSource;
  workspaceId: Workspace.Id;
};

export type ActivityEventModel = SupabaseCrudModelSpec<
  {
    tableName: "activity_events";
    modelName: "ActivityEvent";
    modelPrimaryKeyType: ActivityEventId;
    modelTypes: {
      Read: ActivityEventRead;
      /**
       * Only database triggers write events. These shapes exist for the CRUD
       * spec.
       */
      Insert: SetOptional<
        ActivityEventRead,
        | "actorUserId"
        | "commentId"
        | "id"
        | "occurredAt"
        | "payloadVersion"
        | "recordedAt"
        | "source"
      >;
      Update: Partial<ActivityEventRead>;
    };
  },
  { dbTablePrimaryKey: "id" }
>;
