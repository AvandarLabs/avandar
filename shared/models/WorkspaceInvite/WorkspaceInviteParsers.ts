import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type {
  WorkspaceId,
  WorkspaceRole,
} from "$/models/Workspace/Workspace.types.ts";
import type {
  WorkspaceInviteId,
  WorkspaceInviteModel,
  WorkspaceInviteRead,
  WorkspaceInviteStatus,
} from "$/models/WorkspaceInvite/WorkspaceInvite.types.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  email: z.string(),
  id: z.uuid(),
  invite_status: z.enum(["pending", "accepted"]),
  invite_user_group_ids: z.array(z.uuid()),
  invited_by: z.uuid(),
  role: z.string(),
  role_group_id: z.uuid().nullable(),
  role_overrides: supabaseJSONSchema,
  updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid().nullable(),
  workspace_id: z.uuid(),
});

export const WorkspaceInviteParsers =
  makeParserRegistry<WorkspaceInviteModel>().build({
    modelName: "WorkspaceInvite",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): WorkspaceInviteRead => {
        return Model.make("WorkspaceInvite", {
          ...obj,
          id: obj.id as WorkspaceInviteId,
          workspaceId: obj.workspaceId as WorkspaceId,
          invitedBy: obj.invitedBy as UserId,
          userId: obj.userId as UserId | undefined,
          role: obj.role as WorkspaceRole,
          inviteStatus: obj.inviteStatus as WorkspaceInviteStatus,
        });
      },
    ),

    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["user_id", "role_group_id"]),
    ),

    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsExceptInProps(["user_id", "role_group_id"]),
    ),
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = WorkspaceInviteModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
