import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  excludeUndefinedDeep,
  nullsToUndefinedDeep,
  omitProps,
  pipe,
  snakeCaseKeysDeep,
} from "@avandar/utils";
import { z } from "zod";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { DatasetColumnId } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type {
  DatasetColumnMapping,
  DatasetColumnMappingId,
  DatasetColumnMappingModel,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";
import type { ConceptAttributeId } from "$/models/ontology/ConceptAttribute/ConceptAttribute.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  id: z.uuid(),
  workspace_id: z.uuid(),
  concept_attribute_id: z.uuid(),
  value_picker_rule_type: z.enum(DatasetColumnMappings.ValuePickerTypes),
  dataset_id: z.uuid(),
  dataset_column_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const DatasetColumnMappingParsers =
  makeParserRegistry<DatasetColumnMappingModel>().build({
    modelName: "DatasetColumnMapping",
    DBReadSchema,

    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      (obj): DatasetColumnMapping => {
        return {
          ...obj,
          type: "dataset_column" as const,
          id: obj.id as DatasetColumnMappingId,
          workspaceId: obj.workspaceId as Workspace.Id,
          conceptAttributeId: obj.conceptAttributeId as ConceptAttributeId,
          datasetId: obj.datasetId as DatasetId,
          datasetColumnId: obj.datasetColumnId as DatasetColumnId,
          valuePickerRuleType: obj.valuePickerRuleType ?? "most_frequent",
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      (input) => {
        return {
          ...input,
          // ensure there's always a default value so it doesn't error
          valuePickerRuleType: input.valuePickerRuleType ?? "most_frequent",
        };
      },
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
type CrudTypes = DatasetColumnMappingModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
