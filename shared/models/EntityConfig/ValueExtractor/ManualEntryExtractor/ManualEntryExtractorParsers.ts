import { makeParserRegistry } from "@clients/makeParserRegistry.ts";
import { pipe } from "@utils/misc/pipe/pipe.ts";
import { camelCaseKeysDeep } from "@utils/objects/camelCaseKeys/camelCaseKeys.ts";
import { excludeUndefinedDeep } from "@utils/objects/excludeUndefinedDeep/excludeUndefinedDeep.ts";
import { omitProps } from "@utils/objects/hofs/omitProps/omitProps.ts";
import { nullsToUndefinedDeep } from "@utils/objects/nullsToUndefinedDeep/nullsToUndefinedDeep.ts";
import { snakeCaseKeysDeep } from "@utils/objects/snakeCaseKeys/snakeCaseKeys.ts";
import { z } from "zod";
import type {
  Expect,
  ZodSchemaEqualsTypes,
} from "@utils/types/test-utilities.types.ts";
import type { EntityFieldConfigId } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type {
  ManualEntryExtractor,
  ManualEntryExtractorId,
  ManualEntryExtractorModel,
} from "$/models/EntityConfig/ValueExtractor/ManualEntryExtractor/ManualEntryExtractor.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  entity_field_config_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const ManualEntryExtractorParsers =
  makeParserRegistry<ManualEntryExtractorModel>().build({
    modelName: "ManualEntryExtractor",
    DBReadSchema,

    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): ManualEntryExtractor => {
        return {
          ...obj,
          type: "manual_entry" as const,
          id: obj.id as ManualEntryExtractorId,
          entityFieldConfigId: obj.entityFieldConfigId as EntityFieldConfigId,
          workspaceId: obj.workspaceId as Workspace.Id,
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      excludeUndefinedDeep,
      omitProps("type"),
    ),
  });

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CRUDTypes = ManualEntryExtractorModel;
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
