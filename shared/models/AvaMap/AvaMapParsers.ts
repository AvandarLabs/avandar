import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { supabaseJSONSchema } from "$/lib/zodHelpers.ts";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";
import type { AvaMapId, AvaMapModel } from "$/models/AvaMap/AvaMap.types.ts";
import type { User } from "$/models/User/User.ts";
import type { UserProfile } from "$/models/User/UserProfile.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  config: supabaseJSONSchema,
  created_at: z.iso.datetime({ offset: true }),
  description: z.string().nullable(),
  id: z.uuid(),
  is_public: z.boolean(),
  is_restricted: z.boolean(),
  name: z.string(),
  owner_id: z.uuid(),
  owner_profile_id: z.uuid(),
  slug: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

type DBReadWithoutConfig = Omit<AvaMapModel["DBRead"], "config">;
type ModelReadWithoutConfig = Omit<AvaMapModel["Read"], "config">;
type DBInsertWithoutConfig = Omit<AvaMapModel["DBInsert"], "config">;
type DBUpdateWithoutConfig = Omit<AvaMapModel["DBUpdate"], "config">;

function _camelCaseMapReadRow(
  row: DBReadWithoutConfig,
): ModelReadWithoutConfig {
  const camelCaseRow = camelCaseKeysDeep(row) as ModelReadWithoutConfig;
  return nullsToUndefinedDeep(camelCaseRow) as ModelReadWithoutConfig;
}

function _snakeCaseMapInsertRow(
  row: Omit<AvaMapModel["Insert"], "config">,
): DBInsertWithoutConfig {
  const snakeCaseRow = snakeCaseKeysDeep(row) as DBInsertWithoutConfig;
  const nullableRow = undefinedsToNullsDeep(snakeCaseRow);
  return excludeNullsExceptInProps(["description", "slug"])(
    nullableRow,
  ) as DBInsertWithoutConfig;
}

function _snakeCaseMapUpdateRow(
  row: Omit<AvaMapModel["Update"], "config">,
): DBUpdateWithoutConfig {
  const snakeCaseRow = snakeCaseKeysDeep(row) as DBUpdateWithoutConfig;
  const nullableRow = undefinedsToNullsDeep(snakeCaseRow);
  return excludeNullsExceptInProps(["description", "slug"])(
    nullableRow,
  ) as DBUpdateWithoutConfig;
}

/**
 * Parses `public.maps` rows and map configuration JSON.
 *
 * Config stays outside the deep key transforms because they rename
 * `config.__type` and map-owned keys such as `geoBinding` and `columnIds`.
 */
export const AvaMapParsers = makeParserRegistry<AvaMapModel>().build({
  modelName: "AvaMap",
  DBReadSchema,
  fromDBReadToModelRead: (obj): AvaMapModel["Read"] => {
    const { config, ...row } = obj;
    const modelRow = _camelCaseMapReadRow(row);

    return Model.make("AvaMap", {
      ...modelRow,
      id: modelRow.id as AvaMapId,
      workspaceId: modelRow.workspaceId as Workspace.Id,
      ownerId: modelRow.ownerId as User.Id,
      ownerProfileId: modelRow.ownerProfileId as UserProfile.Id,
      config: AvaMapConfigSchema.fromJson(config),
    });
  },
  fromModelInsertToDBInsert: (model) => {
    const { config, ...row } = model;
    const dbRow = _snakeCaseMapInsertRow(row);

    return {
      ...dbRow,
      config: AvaMapConfigSchema.toJson(config),
    };
  },
  fromModelUpdateToDBUpdate: (model) => {
    const { config, ...row } = model;
    const dbRow = _snakeCaseMapUpdateRow(row);

    return {
      ...dbRow,
      ...(config === undefined ?
        {}
      : {
          config: AvaMapConfigSchema.toJson(config),
        }),
    };
  },
});

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = AvaMapModel;
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
