import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Enums } from "$/types/database.types.ts";
import type { UUID } from "@avandar/utils";
import type { SetOptional } from "type-fest";

export type CommentReactionId = UUID<"CommentReaction">;

/** One of the six reactions. */
export type CommentReactionKind = Enums<"comment_reactions__kind">;

type CommentReactionRead = {
  commentId: Comment.Id;
  createdAt: string;
  id: CommentReactionId;
  kind: CommentReactionKind;
  updatedAt: string;
  userId: User.Id;
  workspaceId: Workspace.Id;
};

export type CommentReactionModel = SupabaseCrudModelSpec<
  {
    tableName: "comment_reactions";
    modelName: "CommentReaction";
    modelPrimaryKeyType: CommentReactionId;
    modelTypes: {
      Read: CommentReactionRead;
      Insert: SetOptional<
        CommentReactionRead,
        "createdAt" | "id" | "updatedAt"
      >;
      Update: Partial<Pick<CommentReactionRead, "kind">>;
    };
  },
  { dbTablePrimaryKey: "id" }
>;
