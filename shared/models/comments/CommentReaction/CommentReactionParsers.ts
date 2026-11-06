import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type {
  CommentReactionId,
  CommentReactionModel,
} from "$/models/comments/CommentReaction/CommentReaction.types.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  comment_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  kind: z.enum(["like", "celebrate", "support", "love", "insightful", "funny"]),
  updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
  workspace_id: z.uuid(),
});

/** Parses `public.comment_reactions` rows. */
export const CommentReactionParsers =
  makeParserRegistry<CommentReactionModel>().build({
    modelName: "CommentReaction",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): CommentReactionModel["Read"] => {
        return {
          ...obj,
          commentId: obj.commentId as Comment.Id,
          id: obj.id as CommentReactionId,
          userId: obj.userId as User.Id,
          workspaceId: obj.workspaceId as Workspace.Id,
        };
      },
    ),
    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
    ),
  });

/** Do not remove these tests! */
type CrudTypes = CommentReactionModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
