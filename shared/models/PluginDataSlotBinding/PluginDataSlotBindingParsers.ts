import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import {
  camelCaseKeysDeep,
  excludeNullsDeep,
  isPlainObject,
  isString,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { z } from "zod";
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type {
  PluginDataSlotBindingId,
  PluginDataSlotBindingModel,
} from "$/models/PluginDataSlotBinding/PluginDataSlotBinding.types.ts";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Json } from "$/types/database.types.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  attribute_map: supabaseJsonSchema,
  bound_by: z.uuid().nullable(),
  concept_id: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid().nullable(),
  id: z.uuid(),
  installation_id: z.uuid(),
  slot_id: z.string(),
  source_type: z.enum(["concept", "dataset"]),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

type ModelReadWithoutMap = Omit<
  PluginDataSlotBindingModel["Read"],
  "attributeMap"
>;

/**
 * The string entries of a stored attribute map. Any signed-in settings admin
 * can write the column directly, so a value that is not a string is dropped
 * and its attribute reads as unmapped.
 */
function _getAttributeMapFromJson(json: Json): Record<string, string> {
  if (!isPlainObject(json)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(json).filter((entry): entry is [string, string] => {
      return isString(entry[1]);
    }),
  );
}

function _snakeCaseRow(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return excludeNullsDeep(undefinedsToNullsDeep(snakeCaseKeysDeep(row)));
}

/**
 * Converts `public.plugin_data_slot_bindings` rows to and from the
 * `PluginDataSlotBinding` model. `PluginDataSlotBindingClient` uses it to
 * read and write which records a plugin's data slots read.
 *
 * The attribute map stays outside the deep key transforms: its keys are the
 * plugin's own attribute keys, which must reach the plugin unchanged.
 */
export const PluginDataSlotBindingParsers =
  makeParserRegistry<PluginDataSlotBindingModel>().build({
    modelName: "PluginDataSlotBinding",
    DBReadSchema,
    fromDBReadToModelRead: (
      databaseReadRow,
    ): PluginDataSlotBindingModel["Read"] => {
      const { attribute_map: attributeMap, ...row } = databaseReadRow;
      const modelRow = nullsToUndefinedDeep(
        camelCaseKeysDeep(row),
      ) as ModelReadWithoutMap;
      return Model.make("PluginDataSlotBinding", {
        ...modelRow,
        attributeMap: _getAttributeMapFromJson(attributeMap),
        boundBy: modelRow.boundBy as User.Id | undefined,
        conceptId: modelRow.conceptId as Concept.Id | undefined,
        datasetId: modelRow.datasetId as Dataset.Id | undefined,
        id: modelRow.id as PluginDataSlotBindingId,
        installationId: modelRow.installationId as PluginInstallation.Id,
        workspaceId: modelRow.workspaceId as Workspace.Id,
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const { attributeMap, ...row } = model;
      return {
        ..._snakeCaseRow(row),
        attribute_map: attributeMap,
      } as PluginDataSlotBindingModel["DBInsert"];
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { attributeMap, ...row } = model;
      return {
        ..._snakeCaseRow(row),
        attribute_map: attributeMap,
      } as PluginDataSlotBindingModel["DBUpdate"];
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = PluginDataSlotBindingModel;
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
