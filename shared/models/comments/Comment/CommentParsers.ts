import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import type {
  CommentId,
  CommentModel,
} from "$/models/comments/Comment/Comment.types.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  author_user_id: z.uuid().nullable(),
  body: supabaseJSONSchema.nullable(),
  body_schema_version: z.number(),
  body_text: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  deleted_at: z.iso.datetime({ offset: true }).nullable(),
  edited_at: z.iso.datetime({ offset: true }).nullable(),
  id: z.uuid(),
  individual_id: z.uuid().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

type ModelReadWithoutBody = Omit<CommentModel["Read"], "body">;
type DBInsertWithoutBody = Omit<CommentModel["DBInsert"], "body">;
type DBUpdateWithoutBody = Omit<CommentModel["DBUpdate"], "body">;

/**
 * Converts every column except `body`. The document is ProseMirror JSON
 * whose keys belong to the editor, so it is never key-cased.
 */
function _camelCaseReadRow(
  row: Omit<CommentModel["DBRead"], "body">,
): ModelReadWithoutBody {
  const camelCaseRow = camelCaseKeysDeep(row) as ModelReadWithoutBody;
  return nullsToUndefinedDeep(camelCaseRow) as ModelReadWithoutBody;
}

function _snakeCaseInsertRow(
  row: Omit<CommentModel["Insert"], "body">,
): DBInsertWithoutBody {
  const snakeCaseRow = snakeCaseKeysDeep(row) as DBInsertWithoutBody;
  const nullableRow = undefinedsToNullsDeep(snakeCaseRow);
  return excludeNullsExceptInProps(["deleted_at"])(
    nullableRow,
  ) as DBInsertWithoutBody;
}

function _snakeCaseUpdateRow(
  row: Omit<CommentModel["Update"], "body">,
): DBUpdateWithoutBody {
  const snakeCaseRow = snakeCaseKeysDeep(row) as DBUpdateWithoutBody;
  const nullableRow = undefinedsToNullsDeep(snakeCaseRow);
  return excludeNullsExceptInProps(["deleted_at"])(
    nullableRow,
  ) as DBUpdateWithoutBody;
}

/** Parses `public.comments` rows. The `body` document is never key-cased. */
export const CommentParsers = makeParserRegistry<CommentModel>().build({
  modelName: "Comment",
  DBReadSchema,
  fromDBReadToModelRead: (databaseReadRow): CommentModel["Read"] => {
    const { body, ...row } = databaseReadRow;
    const modelRow = _camelCaseReadRow(row);
    return {
      ...modelRow,
      authorUserId: modelRow.authorUserId as User.Id | undefined,
      // Not validated here: a document with a node this build does not know
      // must still load, so `RichTextView` can fall back to its plain text.
      body: body === null ? undefined : (body as unknown as RichTextDocument.T),
      id: modelRow.id as CommentId,
      individualId: modelRow.individualId as Individual.Id,
      workspaceId: modelRow.workspaceId as Workspace.Id,
    };
  },
  fromModelInsertToDBInsert: (model) => {
    const { body, ...row } = model;
    return {
      ..._snakeCaseInsertRow(row),
      body: (body ?? null) as Json | null,
    };
  },
  fromModelUpdateToDBUpdate: (model) => {
    const { body, ...row } = model;
    return {
      ..._snakeCaseUpdateRow(row),
      ...(body === undefined ? {} : { body: body as Json }),
    };
  },
});

/** Do not remove these tests! */
type CrudTypes = CommentModel;
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
