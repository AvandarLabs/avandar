import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type CommentId = UUID<"Comment">;

/** A comment on a case, as the app reads it. */
type CommentRead = {
  /** Undefined once the author's account is deleted. */
  authorUserId: User.Id | undefined;
  /** Undefined once the comment is deleted. */
  body: RichTextDocument.T | undefined;
  bodySchemaVersion: number;
  /** Undefined once the comment is deleted. */
  bodyText: string | undefined;
  createdAt: string;
  deletedAt: string | undefined;
  editedAt: string | undefined;
  id: CommentId;
  /**
   * The case. The database requires exactly one subject, and cases are the
   * only one today.
   */
  individualId: Individual.Id;
  updatedAt: string;
  workspaceId: Workspace.Id;
};

export type CommentModel = SupabaseCrudModelSpec<
  {
    tableName: "comments";
    modelName: "Comment";
    modelPrimaryKeyType: CommentId;
    modelTypes: {
      Read: CommentRead;
      Insert: SetOptional<
        CommentRead,
        | "authorUserId"
        | "createdAt"
        | "deletedAt"
        | "editedAt"
        | "id"
        | "updatedAt"
      >;
      Update: Partial<
        Pick<
          CommentRead,
          "body" | "bodySchemaVersion" | "bodyText" | "deletedAt"
        >
      >;
    };
  },
  { dbTablePrimaryKey: "id" }
>;
