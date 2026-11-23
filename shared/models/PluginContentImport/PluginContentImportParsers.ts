import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type {
  PluginContentImportId,
  PluginContentImportModel,
} from "$/models/PluginContentImport/PluginContentImport.types.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  content_id: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  id: z.uuid(),
  imported_by: z.uuid().nullable(),
  plugin_id: z.string(),
  workspace_id: z.uuid(),
});

/**
 * Converts `public.plugin_content_imports` rows to and from the
 * `PluginContentImport` model. `PluginContentImportClient` uses it to read
 * and record which plugin content a workspace imported.
 */
export const PluginContentImportParsers =
  makeParserRegistry<PluginContentImportModel>().build({
    modelName: "PluginContentImport",
    DBReadSchema,
    fromDBReadToModelRead: (
      databaseReadRow,
    ): PluginContentImportModel["Read"] => {
      const modelRow = nullsToUndefinedDeep(
        camelCaseKeysDeep(databaseReadRow),
      ) as PluginContentImportModel["Read"];
      return Model.make("PluginContentImport", {
        ...modelRow,
        datasetId: modelRow.datasetId as Dataset.Id,
        id: modelRow.id as PluginContentImportId,
        importedBy: modelRow.importedBy as User.Id | undefined,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      });
    },
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

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = PluginContentImportModel;
// oxlint-disable-next-line typescript/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
