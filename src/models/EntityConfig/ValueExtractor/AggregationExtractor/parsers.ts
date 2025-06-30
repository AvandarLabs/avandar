import { z } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { omit } from "@/lib/utils/objects/misc";
import {
  camelCaseKeysDeep,
  excludeUndefinedDeep,
  nullsToUndefinedDeep,
  snakeCaseKeysDeep,
} from "@/lib/utils/objects/transformations";
import { uuid } from "@/lib/utils/uuid";
import { jsonType } from "@/lib/utils/zodHelpers";
import { asLocalDatasetId } from "@/models/LocalDataset/utils";
import { AggregationExtractor, AggregationExtractorModel } from "./types";

const DBReadSchema = z.object({
  id: z.string().uuid(),
  entity_field_config_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  aggregation_type: z.enum(["sum", "max", "count"]),
  dataset_id: z.string(),
  dataset_field_id: z.string().uuid(),
  filter: jsonType.nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const AggregationExtractorParsers =
  makeParserRegistry<AggregationExtractorModel>().build({
    modelName: "AggregationExtractor",
    DBReadSchema,
    fromDBReadToModelRead: (
      dbObj: AggregationExtractor<"DBRead">,
    ): AggregationExtractor => {
      const { filter, ...rest } = dbObj;
      // We remove `filter` before we do these conversions, because it's a
      // JSON type, which can really mess up with our recursive type utilities
      const newObj = nullsToUndefinedDeep(camelCaseKeysDeep(rest));
      return {
        ...newObj,
        filter,
        type: "aggregation" as const,
        id: uuid(newObj.id),
        entityFieldConfigId: uuid(newObj.entityFieldConfigId),
        workspaceId: uuid(newObj.workspaceId),
        datasetId: asLocalDatasetId(newObj.datasetId),
        datasetFieldId: uuid(newObj.datasetFieldId),
      };
    },

    fromModelInsertToDBInsert: (
      modelObj: AggregationExtractor<"Insert">,
    ): AggregationExtractor<"DBInsert"> => {
      const { filter, ...rest } = omit(modelObj, "type");
      const newObj = excludeUndefinedDeep(snakeCaseKeysDeep(rest));
      return { ...newObj, filter: filter ?? null };
    },

    fromModelUpdateToDBUpdate: (
      modelObj: AggregationExtractor<"Update">,
    ): AggregationExtractor<"DBUpdate"> => {
      const { filter, ...rest } = omit(modelObj, "type");
      const newObj = excludeUndefinedDeep(snakeCaseKeysDeep(rest));
      return { ...newObj, filter: filter ?? null };
    },
  });

/**
 * Do not remove these tests! These check that your Zod parsers are
 * consistent with your defined model and DB types.
 */
type CRUDTypes = AggregationExtractorModel;
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
