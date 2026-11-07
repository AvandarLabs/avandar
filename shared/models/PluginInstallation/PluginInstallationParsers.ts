import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsExceptInProps,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type {
  PluginInstallationId,
  PluginInstallationModel,
} from "$/models/PluginInstallation/PluginInstallation.types.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  granted_permissions: z.array(z.string()),
  id: z.uuid(),
  installed_by: z.uuid().nullable(),
  installed_version: z.string(),
  is_enabled: z.boolean(),
  plugin_id: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

/** Parses `public.plugin_installations` rows. */
export const PluginInstallationParsers =
  makeParserRegistry<PluginInstallationModel>().build({
    modelName: "PluginInstallation",
    DBReadSchema,
    fromDBReadToModelRead: (
      databaseReadRow,
    ): PluginInstallationModel["Read"] => {
      const modelRow = nullsToUndefinedDeep(
        camelCaseKeysDeep(databaseReadRow),
      ) as PluginInstallationModel["Read"];
      return Model.make("PluginInstallation", {
        ...modelRow,
        id: modelRow.id as PluginInstallationId,
        installedBy: modelRow.installedBy as User.Id | undefined,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const nullableRow = undefinedsToNullsDeep(snakeCaseKeysDeep(model));
      return excludeNullsExceptInProps([])(
        nullableRow,
      ) as PluginInstallationModel["DBInsert"];
    },
    fromModelUpdateToDBUpdate: (model) => {
      const nullableRow = undefinedsToNullsDeep(snakeCaseKeysDeep(model));
      return excludeNullsExceptInProps([])(
        nullableRow,
      ) as PluginInstallationModel["DBUpdate"];
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = PluginInstallationModel;
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
