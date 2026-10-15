import { makeParserRegistry } from "@avandar/clients";
import { Model } from "@avandar/models";
import { camelCaseKeysDeep, pipe, snakeCaseKeysDeep } from "@avandar/utils";
import { z } from "zod";
import { DatabaseConnection } from "$/models/DatabaseConnection/DatabaseConnection.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  PostgresTableDatasetId,
  PostgresTableDatasetModel,
} from "$/models/datasets/PostgresTableDataset/PostgresTableDataset.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";

const DBReadSchema = z.object({
  connection_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
  dataset_id: z.uuid(),
  id: z.uuid(),
  relation_kind: z.enum(["table", "view"]),
  schema_name: z.string(),
  table_name: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
  workspace_id: z.uuid(),
});

export const PostgresTableDatasetParsers =
  makeParserRegistry<PostgresTableDatasetModel>().build({
    modelName: "PostgresTableDataset",
    DBReadSchema,
    fromDBReadToModelRead: pipe(camelCaseKeysDeep, (obj) => {
      return Model.make("PostgresTableDataset", {
        ...obj,
        id: obj.id as PostgresTableDatasetId,
        datasetId: obj.datasetId as DatasetId,
        connectionId: obj.connectionId as DatabaseConnection.Id,
        workspaceId: obj.workspaceId as Workspace.Id,
      });
    }),
    fromModelInsertToDBInsert: snakeCaseKeysDeep,
    fromModelUpdateToDBUpdate: snakeCaseKeysDeep,
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = PostgresTableDatasetModel;
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
