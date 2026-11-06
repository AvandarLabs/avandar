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
  ActivityEventId,
  ActivityEventModel,
  ActivityEventPayload,
} from "$/models/activity/ActivityEvent/ActivityEvent.types.ts";
import type { Comment } from "$/models/comments/Comment/Comment.ts";
import type { Individual } from "$/models/ontology/Individual/Individual.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  actor_user_id: z.uuid().nullable(),
  comment_id: z.uuid().nullable(),
  id: z.uuid(),
  individual_id: z.uuid().nullable(),
  kind: z.enum(["comment_created", "comment_edited", "comment_deleted"]),
  occurred_at: z.iso.datetime({ offset: true }),
  payload: supabaseJSONSchema,
  payload_version: z.number(),
  recorded_at: z.iso.datetime({ offset: true }),
  source: z.enum(["avandar", "external"]),
  workspace_id: z.uuid(),
});

type ModelReadWithoutPayload = Omit<ActivityEventModel["Read"], "payload">;
type DBInsertWithoutPayload = Omit<ActivityEventModel["DBInsert"], "payload">;
type DBUpdateWithoutPayload = Omit<ActivityEventModel["DBUpdate"], "payload">;

/** Nullable columns that must reach the database as `null`. */
const NULLABLE_COLUMNS = [
  "actor_user_id",
  "comment_id",
  "individual_id",
] as const;

/**
 * Converts every column except `payload`, whose keys are stored as the
 * database triggers write them.
 */
function _camelCaseReadRow(
  row: Omit<ActivityEventModel["DBRead"], "payload">,
): ModelReadWithoutPayload {
  const camelCaseRow = camelCaseKeysDeep(row) as ModelReadWithoutPayload;
  return nullsToUndefinedDeep(camelCaseRow) as ModelReadWithoutPayload;
}

function _snakeCaseInsertRow(
  row: Omit<ActivityEventModel["Insert"], "payload">,
): DBInsertWithoutPayload {
  const snakeCaseRow = snakeCaseKeysDeep(row) as DBInsertWithoutPayload;
  const nullableRow = undefinedsToNullsDeep(snakeCaseRow);
  return excludeNullsExceptInProps(NULLABLE_COLUMNS)(
    nullableRow,
  ) as DBInsertWithoutPayload;
}

function _snakeCaseUpdateRow(
  row: Omit<ActivityEventModel["Update"], "payload">,
): DBUpdateWithoutPayload {
  const snakeCaseRow = snakeCaseKeysDeep(row) as DBUpdateWithoutPayload;
  const nullableRow = undefinedsToNullsDeep(snakeCaseRow);
  return excludeNullsExceptInProps(NULLABLE_COLUMNS)(
    nullableRow,
  ) as DBUpdateWithoutPayload;
}

/**
 * Parses `public.activity_events` rows. Only `payload` keeps its keys as
 * stored, in both directions.
 */
export const ActivityEventParsers =
  makeParserRegistry<ActivityEventModel>().build({
    modelName: "ActivityEvent",
    DBReadSchema,
    fromDBReadToModelRead: (databaseReadRow): ActivityEventModel["Read"] => {
      const { payload, ...row } = databaseReadRow;
      const modelRow = _camelCaseReadRow(row);
      return {
        ...modelRow,
        actorUserId: modelRow.actorUserId as User.Id | undefined,
        commentId: modelRow.commentId as Comment.Id | undefined,
        id: modelRow.id as ActivityEventId,
        individualId: modelRow.individualId as Individual.Id,
        payload: (payload ?? {}) as ActivityEventPayload,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      };
    },
    fromModelInsertToDBInsert: (model) => {
      const { payload, ...row } = model;
      return { ..._snakeCaseInsertRow(row), payload: payload as Json };
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { payload, ...row } = model;
      return {
        ..._snakeCaseUpdateRow(row),
        ...(payload === undefined ? {} : { payload: payload as Json }),
      };
    },
  });

/** Do not remove these tests! */
type CrudTypes = ActivityEventModel;
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
