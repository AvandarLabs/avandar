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
import { UserId, UserProfileId } from "$/models/User/User.types.ts";
import { z } from "zod";
import type {
  Dashboard,
  DashboardId,
  DashboardModel,
} from "./Dashboard.types.ts";
import type { Expect, ZodSchemaEqualsTypes } from "@avandar/utils";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  config: supabaseJSONSchema,
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.uuid(),
  is_public: z.boolean(),
  name: z.string(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  slug: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const DashboardParsers = makeParserRegistry<DashboardModel>().build({
  modelName: "Dashboard",
  DBReadSchema,
  fromDBReadToModelRead: pipe(
    camelCaseKeysDeep,
    nullsToUndefinedDeep,
    (obj): Dashboard => {
      return Model.make("Dashboard", {
        ...obj,
        id: obj.id as DashboardId,
        workspaceId: obj.workspaceId as Workspace.Id,
        ownerId: obj.ownerId as UserId,
        ownerProfileId: obj.ownerProfileId as UserProfileId,
      });
    },
  ),
  fromModelInsertToDBInsert: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["config", "description", "slug"]),
  ),
  fromModelUpdateToDBUpdate: pipe(
    snakeCaseKeysDeep,
    undefinedsToNullsDeep,
    excludeNullsExceptInProps(["config", "description", "slug"]),
  ),
});

/**
 * Do not remove these tests!
 */
type CRUDTypes = DashboardModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CRUDTypes["DBRead"]; output: CRUDTypes["DBRead"] }
    >
  >,
];
