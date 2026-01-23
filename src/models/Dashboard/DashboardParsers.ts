import { Expect, ZodSchemaEqualsTypes } from "$/lib/types/testUtilityTypes";
import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { excludeNullsExceptInProps } from "@/lib/utils/objects/higherOrderFuncs";
import {
  camelCaseKeysDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@/lib/utils/objects/transformations";
import { pipe } from "@/lib/utils/pipe";
import { supabaseJSONSchema } from "@/lib/utils/zodHelpers";
import { Models } from "@/models/Model";
import { UserId, UserProfileId } from "../User/User.types";
import type { Dashboard, DashboardId, DashboardModel } from "./Dashboard.types";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

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
      return Models.make("Dashboard", {
        ...obj,
        id: obj.id as DashboardId,
        workspaceId: obj.workspaceId as WorkspaceId,
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
