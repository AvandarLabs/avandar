import { object, string } from "zod";
import { makeParserRegistry } from "@/lib/models/makeParserRegistry";
import { Expect, ZodSchemaEqualsTypes } from "@/lib/types/testUtilityTypes";
import { identity } from "@/lib/utils/misc";
import { uuidType } from "@/lib/utils/zodHelpers";
import { DatasetId } from "../Dataset";
import { LocalDatasetEntryModel } from "./types";

const DBReadSchema = object({
  datasetId: uuidType<DatasetId>(),
  localTableName: string(),
});

export const LocalDatasetEntryParsers =
  makeParserRegistry<LocalDatasetEntryModel>().build({
    modelName: "LocalDatasetEntry",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/**
 * Do not remove these tests!
 */
type CRUDTypes = LocalDatasetEntryModel;
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
