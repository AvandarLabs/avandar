import { CommentReactionParsers } from "$/models/comments/CommentReaction/CommentReaction";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/**
 * CRUD for comment reactions. Setting a reaction is an `insert` with
 * `upsert` on `(comment_id, user_id)`; clearing it is a `delete`.
 */
export const CommentReactionClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "CommentReaction",
    tableName: "comment_reactions",
    dbTablePrimaryKey: "id",
    parsers: CommentReactionParsers,
  }),
);
