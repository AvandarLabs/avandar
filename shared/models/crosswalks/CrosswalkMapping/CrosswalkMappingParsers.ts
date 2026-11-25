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
import { supabaseJSONSchema as supabaseJsonSchema } from "$/lib/zodHelpers.ts";
import { CrosswalkMappingModule } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMappingModule/CrosswalkMappingModule.ts";
import type { CrosswalkId } from "$/models/crosswalks/Crosswalk/Crosswalk.types.ts";
import type { CrosswalkColumnId } from "$/models/crosswalks/CrosswalkColumn/CrosswalkColumn.types.ts";
import type { CrosswalkLayoutId } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";
import type {
  CrosswalkMappingId,
  CrosswalkMappingModel,
} from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  column_id: z.uuid(),
  confidence: z.number().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  crosswalk_id: z.uuid(),
  fill: supabaseJsonSchema,
  id: z.uuid(),
  layout_id: z.uuid(),
  reason: z
    .enum(["name_and_type", "same_values", "similar_layout", "meaning"])
    .nullable(),
  status: z.enum(["suggested", "confirmed"]),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

type ReadWithoutFill = Omit<CrosswalkMappingModel["Read"], "fill">;
type DBReadWithoutFill = Omit<CrosswalkMappingModel["DBRead"], "fill">;

function _readRow(row: DBReadWithoutFill): ReadWithoutFill {
  const camelCaseRow = camelCaseKeysDeep(row) as ReadWithoutFill;
  return nullsToUndefinedDeep(camelCaseRow) as ReadWithoutFill;
}

/** Snake-cases a mapping write, keeping the nulls of its nullable columns. */
function _plainPropsToDB(
  row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return excludeNullsExceptInProps(["confidence", "reason"])(
    undefinedsToNullsDeep(snakeCaseKeysDeep(row)),
  );
}

/**
 * Parses `public.crosswalks__mappings` rows. The fill stays outside the deep
 * key transforms and goes through its versioned schema, so a malformed fill
 * fails loudly. Writes go through `rpc_crosswalks__save`, so the insert and
 * update transforms exist only to satisfy the CRUD client.
 */
export const CrosswalkMappingParsers =
  makeParserRegistry<CrosswalkMappingModel>().build({
    modelName: "CrosswalkMapping",
    DBReadSchema,
    fromDBReadToModelRead: (dbRow): CrosswalkMappingModel["Read"] => {
      const { fill, ...row } = dbRow;
      const modelRow = _readRow(row);
      return Model.make("CrosswalkMapping", {
        ...modelRow,
        id: modelRow.id as CrosswalkMappingId,
        columnId: modelRow.columnId as CrosswalkColumnId,
        crosswalkId: modelRow.crosswalkId as CrosswalkId,
        layoutId: modelRow.layoutId as CrosswalkLayoutId,
        workspaceId: modelRow.workspaceId as Workspace.Id,
        fill: CrosswalkMappingModule.fillFromDBJson(fill),
      });
    },
    fromModelInsertToDBInsert: (model) => {
      const { fill, ...row } = model;
      return {
        ...(_plainPropsToDB(row) as Omit<
          CrosswalkMappingModel["DBInsert"],
          "fill"
        >),
        fill: CrosswalkMappingModule.fillToDBJson(fill),
      };
    },
    fromModelUpdateToDBUpdate: (model) => {
      const { fill, ...row } = model;
      return {
        ...(_plainPropsToDB(row) as Omit<
          CrosswalkMappingModel["DBUpdate"],
          "fill"
        >),
        ...(fill === undefined
          ? {}
          : { fill: CrosswalkMappingModule.fillToDBJson(fill) }),
      };
    },
  });

/** Keeps the database schema and CRUD row types aligned. */
type CrudTypes = CrosswalkMappingModel;
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
