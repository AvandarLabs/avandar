import { CommentParsers } from "$/models/comments/Comment/Comment";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

/** CRUD for case comments. Deleting a comment is an update of `deletedAt`. */
export const CommentClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Comment",
    tableName: "comments",
    dbTablePrimaryKey: "id",
    parsers: CommentParsers,
  }),
);
